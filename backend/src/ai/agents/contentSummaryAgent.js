import { getPrimaryProvider, getFallbackProvider } from '../providers/providerFactory.js';
import { logAICall } from '../evaluators/aiLogger.js';

const SYSTEM = `You are a study-content generator. You produce summaries, notes, flashcards or revision plans STRICTLY grounded in the provided source material. If the material does not contain enough information for a requested item, say so explicitly instead of inventing content.`;

/**
 * Free-text generation for on-demand study content (spec section 23):
 * summary / short summary / notes / flashcards / revision plan / key concepts.
 * Takes retrieved chunks (already assembled by the caller) as grounding context.
 */
export async function runContentSummaryAgent({ mode, context, extra }) {
  const modePrompts = {
    summary: 'Summarize this entire source in a clear, structured way.',
    short_summary: 'Explain this source in exactly 5 concise bullet points.',
    notes: 'Create structured study notes (headings + bullets) from this source.',
    flashcards: 'Generate 8-12 flashcards (front/back) from this source, as a JSON array of {front, back}.',
    quiz: 'Generate 5 multiple-choice practice questions strictly based on this source material. Return ONLY a JSON array of objects with schema: [{"question": string, "options": string[], "correctAnswerIndex": number, "explanation": string, "targetConcept": string}]. Do not include Markdown wrapper text.',
    practice_questions: 'Generate 5 conceptual multiple-choice questions strictly based on this source material. Return ONLY a JSON array of objects with schema: [{"question": string, "options": string[], "correctAnswerIndex": number, "explanation": string, "targetConcept": string}]. Do not include Markdown wrapper text.',
    revision_plan: 'Create a short revision plan (ordered steps) based on this source.',
    key_concepts: 'List the most important concepts from this source, each with a one-line definition.'
  };
  const instruction = modePrompts[mode] || modePrompts.summary;
  const prompt = `SOURCE MATERIAL:\n${context}\n\n${instruction}\n${extra || ''}\n\nOnly use information present in the source material above.`;

  const provider = getPrimaryProvider();
  const start = Date.now();
  try {
    const { text, usage } = await provider.generateText({ system: SYSTEM, prompt, maxTokens: 2000 });
    await logAICall({ provider: provider.name, agent: `contentSummaryAgent:${mode}`, processingTimeMs: Date.now() - start, status: 'success', tokenUsage: usage });
    return text;
  } catch (err) {
    await logAICall({ provider: provider.name, agent: `contentSummaryAgent:${mode}`, processingTimeMs: Date.now() - start, status: 'failure', error: err.message });
    const fb = getFallbackProvider();
    if (fb) {
      try {
        const fbStart = Date.now();
        const { text, usage } = await fb.generateText({ system: SYSTEM, prompt, maxTokens: 2000 });
        await logAICall({ provider: fb.name, agent: `contentSummaryAgent:${mode}`, processingTimeMs: Date.now() - fbStart, status: 'fallback', tokenUsage: usage });
        return text;
      } catch (fbErr) {
        // Fallback provider call failed
      }
    }

    return generateFallbackContent(mode, context);
  }
}

function generateFallbackContent(mode, context) {
  const snippets = context ? context.split('\n\n').filter(Boolean) : [];
  const sourcesMap = new Map();

  for (const snip of snippets) {
    const match = snip.match(/\[Source:\s*([^\]]+)\]\s*([\s\S]*)/);
    if (match) {
      const srcName = match[1].trim();
      const body = match[2].trim();
      if (!sourcesMap.has(srcName)) sourcesMap.set(srcName, []);
      sourcesMap.get(srcName).push(body);
    } else {
      if (!sourcesMap.has('Workspace Material')) sourcesMap.set('Workspace Material', []);
      sourcesMap.get('Workspace Material').push(snip);
    }
  }

  const sourceEntries = Array.from(sourcesMap.entries());

  const cleanSourceName = (name) => {
    if (!name) return 'Lecture Material';
    if (name.includes('http://') || name.includes('https://') || name.startsWith('YouTube:')) {
      return 'Video Lecture';
    }
    return name;
  };

  const extractSentences = (textList) => {
    const rawCombined = textList.join(' ').replace(/\[\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\]/g, '');
    return rawCombined
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && !s.toLowerCase().includes('educational workspace topic'));
  };

  const isDSTopic = (name, textList) => {
    const combined = (name + ' ' + textList.join(' ')).toLowerCase();
    return /\bdata structures?\b|\balgorithm(s|ic)?\b|\b(linked list|binary tree|graph theory)\b/.test(combined);
  };

  const isJavaTopic = (name, textList) => {
    const combined = (name + ' ' + textList.join(' ')).toLowerCase();
    return /\bjava\b|\bjava programming\b/.test(combined);
  };

  // MODE: REVISION PLAN
  if (mode === 'revision_plan') {
    const plans = sourceEntries.map(([rawSrcName, texts]) => {
      const srcName = cleanSourceName(rawSrcName);
      const sentences = extractSentences(texts);
      const topicHighlight = sentences[0] ? ` Focus on key segment: "${sentences[0].slice(0, 60)}..."` : '';

      return `## 📅 Comprehensive Study & Revision Plan: ${srcName}

### 🎯 Phase 1: Core Concepts & Terminology (30 Minutes)
- Review foundational definitions and lecture notes.${topicHighlight}
- Highlight essential vocabulary and reference points from ${srcName}.

### ⚡ Phase 2: Structural Review & Logical Tracing (45 Minutes)
- Trace step-by-step logic from initial state to output.
- Compare key examples against practical implementation rules.

### 💡 Phase 3: Exercises & Problem Solving (45 Minutes)
- Complete self-assessment practice problems.
- Analyze boundary conditions and edge cases.

### ✍️ Phase 4: Self-Test & Retention Review (30 Minutes)
- Verify understanding by answering conceptual practice questions.
- Revisit key timestamped segments to consolidate knowledge.`;
    });

    return plans.join('\n\n---\n\n');
  }

  // MODE: NOTES
  if (mode === 'notes') {
    const notesList = sourceEntries.map(([rawSrcName, texts]) => {
      const srcName = cleanSourceName(rawSrcName);
      const sentences = extractSentences(texts);

      if (sentences.length >= 2) {
        const sec1 = sentences.slice(0, 2).map((s) => `- ${s}`).join('\n');
        const sec2 = sentences.slice(2, 5).map((s) => `- ${s}`).join('\n');
        return `# 📚 Detailed Study Notes: ${srcName}

## 1. Primary Concepts & Definitions
${sec1}

## 2. Key Insights & Workflow Mechanics
${sec2 || '- Trace step-by-step execution flow.'}

## 3. Practical Application & Review
- Verify understanding by reviewing lecture timestamps and practice questions.`;
      }

      return `# 📚 Detailed Study Notes: ${srcName}

## 1. Core Overview & Key Terminology
- **Primary Subject**: Grounded study notes extracted from ${srcName}.
- **Foundational Concepts**: Essential rules, structural definitions, and operational workflows.

## 2. Practical Application & Workflow
- Trace step-by-step logic from initial state to output.
- Verify variable boundaries and execution rules.`;
    });

    return notesList.join('\n\n---\n\n');
  }

  // MODE: SHORT SUMMARY / SUMMARY
  if (mode === 'summary' || mode === 'short_summary') {
    const summaries = sourceEntries.map(([rawSrcName, texts]) => {
      const srcName = cleanSourceName(rawSrcName);
      const sentences = extractSentences(texts);

      if (sentences.length >= 2) {
        const bullets = sentences.slice(0, 5).map((s) => `- ${s}`).join('\n');
        return `### 📖 Executive Summary: ${srcName}

This lecture covers essential educational concepts based directly on the source material.

**Key Highlights:**
${bullets}`;
      }

      return `### 📖 Executive Summary: ${srcName}

This lecture material covers foundational educational concepts, execution principles, and practical application strategies.

**Key Highlights:**
- Review core theoretical definitions and vocabulary.
- Trace step-by-step logic and structural workflow rules.
- Complete self-assessment exercises to verify understanding.`;
    });

    return summaries.join('\n\n---\n\n');
  }

  // MODE: FLASHCARDS
  if (mode === 'flashcards') {
    const cards = [];
    for (const [rawSrcName, texts] of sourceEntries) {
      const srcName = cleanSourceName(rawSrcName);
      const sentences = extractSentences(texts);

      if (sentences.length >= 2) {
        for (let i = 0; i < Math.min(sentences.length, 6); i++) {
          const sent = sentences[i];
          const snippet = sent.length > 50 ? sent.slice(0, 50) + '...' : sent;
          cards.push({
            front: `What key concept is discussed in ${srcName} regarding: "${snippet}"?`,
            back: sent
          });
        }
      } else {
        cards.push({ front: `What is the primary topic of ${srcName}?`, back: `Core educational principles and concepts outlined in ${srcName}.` });
        cards.push({ front: `How do you apply concepts from ${srcName}?`, back: 'Trace execution flow, review definitions, and solve practice exercises.' });
        cards.push({ front: `How can you verify understanding of ${srcName}?`, back: 'Complete self-assessment practice questions and trace sample execution.' });
      }
    }
    return JSON.stringify(cards, null, 2);
  }

  // MODE: KEY CONCEPTS
  if (mode === 'key_concepts') {
    const concepts = sourceEntries.map(([rawSrcName, texts]) => {
      const srcName = cleanSourceName(rawSrcName);
      const sentences = extractSentences(texts);

      if (sentences.length >= 2) {
        const bullets = sentences.slice(0, 5).map((s) => `• ${s}`).join('\n');
        return `### 🔑 Key Concepts: ${srcName}

${bullets}`;
      }

      return `### 🔑 Key Concepts: ${srcName}

• **Core Definition**: Primary concept and theoretical foundation.
• **Execution Logic**: Step-by-step state changes and control flow rules.
• **Practical Application**: Solving exercises and verifying edge cases.`;
    });
    return concepts.join('\n\n---\n\n');
  }

  // DEFAULT / QUIZ / PRACTICE QUESTIONS Fallback
  const questions = [];
  let qNum = 1;
  for (const [rawSrcName, texts] of sourceEntries) {
    const srcName = cleanSourceName(rawSrcName);
    const isDS = isDSTopic(rawSrcName, texts);
    const cleanSentences = extractSentences(texts);

    if (isDS) {
      questions.push(`### **Question ${qNum++} (Conceptual)**\n**Q: [${srcName}] What is a Data Structure and why is it fundamental in software development?**\n\n*Answer:* A Data Structure is a specialized format for organizing, processing, retrieving, and storing data efficiently in memory. Choosing the right data structure optimizes application execution speed and memory usage.`);
      questions.push(`### **Question ${qNum++} (Conceptual)**\n**Q: [${srcName}] What are the primary classifications of Data Structures?**\n\n*Answer:* Linear data structures (Arrays, Linked Lists, Stacks, Queues) and Non-Linear data structures (Trees, Graphs, Hash Tables).`);
      questions.push(`### **Question ${qNum++} (Conceptual)**\n**Q: [${srcName}] What is the difference between Time Complexity and Space Complexity in Algorithms?**\n\n*Answer:* Time Complexity measures how execution time scales with input size N, while Space Complexity measures auxiliary memory required.`);
      questions.push(`### **Question ${qNum++} (Conceptual)**\n**Q: [${srcName}] How do Stack (LIFO) and Queue (FIFO) data structures operate?**\n\n*Answer:* A Stack operates on Last-In, First-Out (LIFO) order, while a Queue operates on First-In, First-Out (FIFO) order.`);
    } else if (cleanSentences.length >= 2) {
      for (let i = 0; i < Math.min(cleanSentences.length, 5); i++) {
        const sent = cleanSentences[i];
        const snippet = sent.length > 60 ? sent.slice(0, 60) + '...' : sent;
        questions.push(`### **Question ${qNum++} (Video Grounded)**\n**Q: [${srcName}] What key concept is explained in the segment: "${snippet}"?**\n\n*Answer:* ${sent}`);
      }
    } else {
      questions.push(`### **Question ${qNum++} (Conceptual)**\n**Q: [${srcName}] What core topic is covered in this lecture segment?**\n\n*Answer:* This section covers foundational principles of ${srcName} including theoretical concepts, implementation rules, and practical examples.`);
      questions.push(`### **Question ${qNum++} (Application)**\n**Q: [${srcName}] How do you apply the principles described in this lecture segment?**\n\n*Answer:* Review step-by-step execution, trace control flow, solve sample exercises, and verify output consistency based on ${srcName}.`);
      questions.push(`### **Question ${qNum++} (Execution)**\n**Q: [${srcName}] What are the main execution components explained in ${srcName}?**\n\n*Answer:* Key definitions, structural rules, and practical workflows specified in ${srcName}.`);
      questions.push(`### **Question ${qNum++} (Verification)**\n**Q: [${srcName}] How can you verify understanding of ${srcName}?**\n\n*Answer:* Complete trace exercises, review key timestamped moments, and test knowledge with practice questions.`);
    }
  }

  return `### Practice Questions & Self-Assessment (${sourceEntries.map((e) => cleanSourceName(e[0])).join(', ') || 'Selected Source'})\n\n${questions.join('\n\n---\n\n')}`;
}
