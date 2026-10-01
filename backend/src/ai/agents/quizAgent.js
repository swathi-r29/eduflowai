import { runAgent } from '../orchestrator/runAgent.js';
import { quizSchema } from '../schemas/index.js';

const SYSTEM = `You are an assessment-design expert. You generate 3-5 multiple choice questions that target ONE specific misconception or concept, progressing from concept recognition, to concept understanding, to application, to reasoning. Questions must be generated fresh each time based on the given context — never reuse stock questions. Each question needs plausible distractors, not obviously-wrong options.`;

export async function runQuizAgent({ targetConcept, misconception, context, count = 4, difficulty = 'medium' }) {
  const prompt = `
TARGET CONCEPT: ${targetConcept}
DIFFICULTY LEVEL: ${String(difficulty).toUpperCase()} (Tailor question complexity, distractor subtlety, and code snippet depth to this level)
MISCONCEPTION TO ADDRESS: ${misconception || 'N/A'}
SUPPORTING CONTEXT:
${context || 'N/A'}

Generate ${count} multiple choice questions (4 options each) at ${String(difficulty).toUpperCase()} difficulty level, targeting "${targetConcept}". Return JSON:
{ "questions": [ { "question": string, "options": string[], "correctAnswerIndex": number, "explanation": string, "difficulty": "${difficulty}", "targetConcept": string } ] }`;
  const result = await runAgent({
    agentName: 'quizAgent',
    system: SYSTEM,
    prompt,
    schema: quizSchema,
    maxTokens: 3000
  });
  return result.questions;
}
