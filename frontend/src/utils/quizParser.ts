export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  targetConcept?: string;
}

/**
 * Parses raw generated quiz content (either JSON string or Markdown text) into structured QuizQuestion array.
 */
export function parseQuizContent(rawContent: string): QuizQuestion[] {
  if (!rawContent || typeof rawContent !== 'string') return [];

  // 1. Try parsing JSON array directly or from code blocks
  const cleanJsonText = rawContent
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  if (cleanJsonText.startsWith('[') && cleanJsonText.endsWith(']')) {
    try {
      const parsed = JSON.parse(cleanJsonText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.map((item: any, idx: number) => {
          const rawOpts = Array.isArray(item.options) ? item.options : [];
          // Strip leading A), B), C), D) prefixes if present in options array items
          const cleanedOpts = rawOpts.map((opt: string) =>
            String(opt).replace(/^[A-D][\):.]\s*/i, '').trim()
          );

          let correctIdx = typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0;
          if (correctIdx < 0 || correctIdx >= cleanedOpts.length) correctIdx = 0;

          return {
            question: item.question || item.questionText || `Question ${idx + 1}`,
            options: cleanedOpts.length >= 2 ? cleanedOpts : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: correctIdx,
            explanation: item.explanation || 'Refer to lesson material for details.',
            targetConcept: item.targetConcept || item.topic || `Concept ${idx + 1}`
          };
        });

        if (valid.length > 0) return valid;
      }
    } catch (e) {
      // Ignore JSON parse error, fall through to Markdown parser
    }
  }

  // 2. Parse Markdown formatted questions (like in user screenshot)
  const questions: QuizQuestion[] = [];
  
  // Split content by "Question " or "### Question" or "## Question"
  const blocks = rawContent.split(/(?=(?:###?\s*)?Question\s+\d+)/i).filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    // Find question title/statement
    let questionText = '';
    const qTitleLine = lines.find((l) => /^Question\s+\d+/i.test(l) || /^###?\s*Question/i.test(l));
    
    // Find question text (next non-option line)
    const textLines: string[] = [];
    let collectingText = false;
    for (const line of lines) {
      if (/^Question\s+\d+/i.test(line) || /^###?\s*Question/i.test(line)) {
        collectingText = true;
        continue;
      }
      if (/^[-*]?\s*[A-D][\):.]/i.test(line) || /^Answer:/i.test(line)) {
        break;
      }
      if (collectingText && line) {
        textLines.push(line.replace(/^\*\*/, '').replace(/\*\*$/, ''));
      }
    }
    questionText = textLines.join(' ').trim();
    if (!questionText && qTitleLine) {
      questionText = qTitleLine;
    }

    // Find options A), B), C), D)
    const rawOptions: { letter: string; text: string }[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*]?\s*([A-D])[\):.]\s*(.*)/i);
      if (match) {
        rawOptions.push({
          letter: match[1].toUpperCase(),
          text: match[2].trim()
        });
      }
    }

    // Find Answer line (e.g. "Answer: B) Runtime polymorphism" or "Answer: B")
    let answerLetter = 'A';
    const answerLine = lines.find((l) => /^Answer:/i.test(l) || /^\*\*Answer:\*\*/i.test(l));
    if (answerLine) {
      const ansMatch = answerLine.match(/(?:Answer:|\*\*Answer:\*\*)\s*([A-D])[\):.]?/i);
      if (ansMatch) {
        answerLetter = ansMatch[1].toUpperCase();
      }
    }

    // Find Explanation
    let explanationText = '';
    const expLineIndex = lines.findIndex((l) => /^Explanation:/i.test(l) || /^\*Explanation:\*/i.test(l));
    if (expLineIndex !== -1) {
      explanationText = lines
        .slice(expLineIndex)
        .join(' ')
        .replace(/^(?:\*?Explanation:\*?\s*)/i, '')
        .trim();
    }

    if (rawOptions.length >= 2 && questionText) {
      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const correctAnswerIndex = letterMap[answerLetter] ?? 0;

      questions.push({
        question: questionText,
        options: rawOptions.map((o) => o.text),
        correctAnswerIndex: correctAnswerIndex < rawOptions.length ? correctAnswerIndex : 0,
        explanation: explanationText || 'Based on the source material details.',
        targetConcept: `Question ${questions.length + 1}`
      });
    }
  }

  return questions;
}
