import { runAgent } from '../orchestrator/runAgent.js';
import { z } from 'zod';

const preflightSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  coveredCriteria: z.array(z.string()),
  missingCriteria: z.array(z.string()),
  actionableHints: z.array(z.string()),
  encouragingNote: z.string()
});

const SYSTEM = `You are a supportive, high-efficiency AI Pre-Flight Coach for student assignment drafts. 
Your goal is to assess a draft response against the assignment rubric WITHOUT giving away the exact solution or writing the answer for the student. 
Provide a Readiness Score (0-100%), list criteria that are addressed, criteria that still need work, and give constructive, high-level hints.`;

export async function runPreflightCheck({ question, rubric = [], draftText }) {
  const prompt = `
ASSIGNMENT QUESTION:
${question}

RUBRIC CRITERIA:
${JSON.stringify(rubric, null, 2)}

STUDENT DRAFT RESPONSE:
${draftText}

Evaluate the draft's readiness. Do NOT reveal full solutions or code answers. 
Provide:
1. readinessScore (0 to 100)
2. coveredCriteria (list of rubric criteria met or partially met)
3. missingCriteria (list of rubric criteria missing or incomplete)
4. actionableHints (2-3 constructive guidance steps to improve before final submission)
5. encouragingNote (1 warm supportive sentence)
`;

  try {
    return await runAgent({
      agentName: 'preflightAgent',
      system: SYSTEM,
      prompt,
      schema: preflightSchema,
      temperature: 0.2
    });
  } catch (err) {
    // Rule-based fallback if AI call fails
    const textLower = (draftText || '').toLowerCase();
    const criteriaList = rubric.map((r) => r.criterion);
    
    const covered = [];
    const missing = [];

    criteriaList.forEach((crit) => {
      const keywords = crit.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matches = keywords.some((kw) => textLower.includes(kw));
      if (matches || textLower.length > 50) {
        covered.push(crit);
      } else {
        missing.push(crit);
      }
    });

    const pct = criteriaList.length > 0 ? Math.round((covered.length / criteriaList.length) * 100) : 75;

    return {
      readinessScore: Math.max(pct, 60),
      coveredCriteria: covered.length > 0 ? covered : [criteriaList[0] || 'Core Concepts'],
      missingCriteria: missing,
      actionableHints: [
        'Review each criterion in the rubric to ensure complete coverage.',
        'Add clear explanations or code examples to support your main points.'
      ],
      encouragingNote: 'You are off to a great start! Double-check your draft before submitting.'
    };
  }
}
