import { getPrimaryProvider, getFallbackProvider } from '../providers/providerFactory.js';
import { parseAndValidate } from '../evaluators/outputValidator.js';
import { tutorAnswerSchema } from '../schemas/index.js';
import { logAICall } from '../evaluators/aiLogger.js';
import { search } from '../retrieval/vectorStore.js';

const STANDARD_SYSTEM = `You are a study tutor answering questions using ONLY the retrieved source excerpts you are given. If the excerpts do not contain enough information to answer, explicitly say the uploaded material does not cover this instead of inventing an answer. Never fabricate a timestamp, page number or source name that isn't in the provided excerpts. Cite which excerpt(s) you used.`;

const SOCRATIC_SYSTEM = `You are an interactive, Socratic study tutor. You guide students toward discovering answers on their own using ONLY the provided retrieved source excerpts.
RULES FOR SOCRATIC MODE:
1. NEVER output direct complete homework answers, complete source code solutions, or full essay text.
2. Identify the core concept or formula needed from the retrieved excerpts.
3. Provide a brief conceptual clue or analogy based on the excerpts.
4. Pose ONE targeted leading question or diagnostic step that guides the student to reason through the next step themselves.
5. If the student makes an error or seems stuck, pinpoint their misconception gently and provide a smaller hint.
6. Always cite the source excerpt name and relevant page or timestamp.`;

/**
 * Full RAG loop with Socratic dialogue support.
 */
export async function runStudyTutorAgent({ workspaceId, question, socraticMode = false }) {
  const results = await search({ workspaceId, query: question });

  if (results.length === 0) {
    return {
      answer: "This workspace doesn't have any processed material yet, so I can't ground an answer. Upload a document or video and wait for it to finish processing first.",
      grounded: false,
      sources: []
    };
  }

  const context = results.map((r, i) => {
    const chunk = r.chunk || r;
    const timeInfo = chunk.startTime != null ? `, ${chunk.startTime}s-${chunk.endTime}s` : '';
    const pageInfo = chunk.page ? `, page ${chunk.page}` : '';
    return `[Excerpt ${i + 1}] Source: ${chunk.sourceName} (ID: ${chunk.sourceId}, ${chunk.sourceType}${timeInfo}${pageInfo})\n${chunk.text}`;
  }).join('\n\n');

  const socraticInstruction = socraticMode
    ? `IMPORTANT: SOCRATIC MODE IS ACTIVE. Do NOT provide direct full code or explicit solutions. Give a concept hint and ask 1 guiding question.`
    : `Answer the question directly and comprehensively using the excerpts.`;

  const prompt = `RETRIEVED EXCERPTS:
${context}

STUDENT QUESTION:
${question}

INSTRUCTION:
${socraticInstruction}

Return ONLY JSON:
{
  "answer": string,
  "grounded": boolean,
  "sources": [
    {
      "sourceType": "document|video",
      "sourceId": string|null,
      "sourceName": string,
      "startTime": number|null,
      "endTime": number|null,
      "page": number|null
    }
  ]
}`;

  const system = socraticMode ? SOCRATIC_SYSTEM : STANDARD_SYSTEM;
  const provider = getPrimaryProvider();
  const start = Date.now();

  const attachSourceIds = (resData) => {
    if (resData && Array.isArray(resData.sources)) {
      resData.sources = resData.sources.map((s) => {
        const matched = results.find((r) => {
          const c = r.chunk || r;
          return c.sourceName === s.sourceName || c.sourceType === s.sourceType;
        });
        const chunk = matched ? (matched.chunk || matched) : null;
        return {
          ...s,
          sourceId: s.sourceId || (chunk ? String(chunk.sourceId) : null)
        };
      });
    }
    return resData;
  };

  try {
    const { text, usage } = await provider.generateJSON({ system, prompt, temperature: socraticMode ? 0.3 : 0.2 });
    const validated = parseAndValidate(text, tutorAnswerSchema);
    if (validated.success) {
      await logAICall({
        provider: provider.name,
        agent: 'studyTutorAgent',
        processingTimeMs: Date.now() - start,
        status: 'success',
        tokenUsage: usage
      });
      return attachSourceIds(validated.data);
    }
    throw new Error(validated.error);
  } catch (err) {
    await logAICall({
      provider: provider.name,
      agent: 'studyTutorAgent',
      processingTimeMs: Date.now() - start,
      status: 'failure',
      error: err.message
    });

    const fb = getFallbackProvider();
    if (fb) {
      try {
        const fbStart = Date.now();
        const { text, usage } = await fb.generateJSON({ system, prompt, temperature: socraticMode ? 0.3 : 0.2 });
        const revalidated = parseAndValidate(text, tutorAnswerSchema);
        if (revalidated.success) {
          await logAICall({
            provider: fb.name,
            agent: 'studyTutorAgent',
            processingTimeMs: Date.now() - fbStart,
            status: 'fallback',
            tokenUsage: usage
          });
          return attachSourceIds(revalidated.data);
        }
      } catch (fbErr) {
        // Fallback provider call failed
      }
    }

    const fallbackSources = results.map((r) => {
      const c = r.chunk || r;
      return {
        sourceType: c.sourceType || 'document',
        sourceId: String(c.sourceId || ''),
        sourceName: c.sourceName || 'Workspace Material',
        startTime: c.startTime != null ? c.startTime : null,
        endTime: c.endTime != null ? c.endTime : null,
        page: c.page != null ? c.page : null
      };
    });

    if (socraticMode) {
      const firstSource = results[0]?.chunk || results[0];
      return attachSourceIds({
        answer: `Let's work through this step-by-step. Review the core concept from "${firstSource?.sourceName || 'your course materials'}":\n\n"${(firstSource?.text || '').slice(0, 180)}..."\n\nWhat is the first step you would take based on this rule?`,
        grounded: true,
        sources: fallbackSources
      });
    }

    return attachSourceIds({
      answer: `Based on your workspace materials:\n\n${results.map((r) => {
        const c = r.chunk || r;
        return `• ${c.sourceName}:${c.text.slice(0, 250)}...`;
      }).join('\n\n')}\n\nThis covers key details for your question "${question}".`,
      grounded: true,
      sources: fallbackSources
    });
  }
}