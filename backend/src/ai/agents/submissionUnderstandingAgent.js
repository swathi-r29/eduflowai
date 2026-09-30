import { runAgent } from '../orchestrator/runAgent.js';
import { submissionUnderstandingSchema } from '../schemas/index.js';

const SYSTEM = `You are an expert academic assessor. You read a student's submission next to the assignment question, rubric and (if given) a sample solution, and identify exactly which concepts the student demonstrated, which they missed, and how they reasoned. You never grade here — only understand. Be precise and evidence-based; quote short snippets from the submission as evidence.`;

export async function runSubmissionUnderstandingAgent({ question, rubric, sampleSolution, submissionText }) {
  const prompt = `
ASSIGNMENT QUESTION:
${question}

RUBRIC:
${JSON.stringify(rubric, null, 2)}

SAMPLE SOLUTION (may be empty):
${sampleSolution || 'N/A'}

STUDENT SUBMISSION:
${submissionText}

Return JSON with this exact shape:
{
  "understoodTask": boolean,
  "expectedConcepts": string[],
  "demonstratedConcepts": string[],
  "missingConcepts": string[],
  "reasoningSummary": string,
  "evidence": string[]
}`;
  return runAgent({
    agentName: 'submissionUnderstandingAgent',
    system: SYSTEM,
    prompt,
    schema: submissionUnderstandingSchema
  });
}
