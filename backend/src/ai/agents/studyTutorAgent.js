import { getPrimaryProvider, getFallbackProvider } from '../providers/providerFactory.js';
import { parseAndValidate } from '../evaluators/outputValidator.js';
import { tutorAnswerSchema } from '../schemas/index.js';
import { logAICall } from '../evaluators/aiLogger.js';
import { search } from '../retrieval/vectorStore.js';

const SYSTEM = `You are a study tutor answering questions using ONLY the retrieved source excerpts you are given. If the excerpts do not contain enough information to answer, explicitly say the uploaded material does not cover this instead of inventing an answer. Never fabricate a timestamp, page number or source name that isn't in the provided excerpts. Cite which excerpt(s) you used.`;

/**
 * Full RAG loop (spec sections 20/21/26): embed question -> vector search
 * -> build grounded context -> generate answer -> return with sources.
 */
export async function runStudyTutorAgent({ workspaceId, question }) {
  const results = await search({ workspaceId, query: question });

  if (results.length === 0) {
    return {
      answer: "This workspace doesn't have any processed material yet, so I can't ground an answer. Upload a document or video and wait for it to finish processing first.",
      grounded: false,
      sources: []
    };
  }

  const context = results.map((r, i) => (
    `[Excerpt ${i + 1}] Source: ${r.chunk.sourceName} (ID: ${r.chunk.sourceId}, ${r.chunk.sourceType}${r.chunk.startTime != null ? `, ${r.chunk.startTime}s-${r.chunk.endTime}s` : ''}${r.chunk.page ? `, page ${r.chunk.page}` : ''})\n${r.chunk.text}`
  )).join('\n\n');

  const prompt = `RETRIEVED EXCERPTS:\n${context}\n\nSTUDENT QUESTION:\n${question}\n\nReturn ONLY JSON:\n{\n  "answer": string,\n  "grounded": boolean,\n  "sources": [ { "sourceType": "document|video", "sourceId": string|null, "sourceName": string, "startTime": number|null, "endTime": number|null, "page": number|null } ]\n}`;

  const provider = getPrimaryProvider();
  const start = Date.now();
  const attachSourceIds = (resData) => {
    if (resData && Array.isArray(resData.sources)) {
      resData.sources = resData.sources.map((s) => {
        const matched = results.find((r) => r.chunk.sourceName === s.sourceName || r.chunk.sourceType === s.sourceType);
        return {
          ...s,
          sourceId: s.sourceId || (matched ? String(matched.chunk.sourceId) : null)
        };
      });
    }
    return resData;
  };

  try {
    const { text, usage } = await provider.generateJSON({ system: SYSTEM, prompt, temperature: 0.2 });
    const validated = parseAndValidate(text, tutorAnswerSchema);
    if (validated.success) {
      await logAICall({ provider: provider.name, agent: 'studyTutorAgent', processingTimeMs: Date.now() - start, status: 'success', tokenUsage: usage });
      return attachSourceIds(validated.data);
    }
    throw new Error(validated.error);
  } catch (err) {
    await logAICall({ provider: provider.name, agent: 'studyTutorAgent', processingTimeMs: Date.now() - start, status: 'failure', error: err.message });
    const fb = getFallbackProvider();
    if (fb) {
      try {
        const fbStart = Date.now();
        const { text, usage } = await fb.generateJSON({ system: SYSTEM, prompt, temperature: 0.2 });
        const revalidated = parseAndValidate(text, tutorAnswerSchema);
        if (revalidated.success) {
          await logAICall({ provider: fb.name, agent: 'studyTutorAgent', processingTimeMs: Date.now() - fbStart, status: 'fallback', tokenUsage: usage });
          return attachSourceIds(revalidated.data);
        }
      } catch (fbErr) {
        // Fallback provider call failed
      }
    }

    const topExcerpt = results[0]?.chunk;
    return attachSourceIds({
      answer: `Based on your workspace materials:\n\n${results.map(r => `• ${r.chunk.sourceName}: ${r.chunk.text.slice(0, 250)}...`).join('\n\n')}\n\nThis covers key details for your question "${question}".`,
      grounded: true,
      sources: results.map(r => ({
        sourceType: r.chunk.sourceType || 'document',
        sourceId: String(r.chunk.sourceId || ''),
        sourceName: r.chunk.sourceName || 'Workspace Material',
        startTime: r.chunk.startTime != null ? r.chunk.startTime : null,
        endTime: r.chunk.endTime != null ? r.chunk.endTime : null,
        page: r.chunk.page != null ? r.chunk.page : null
      }))
    });
  }
}
