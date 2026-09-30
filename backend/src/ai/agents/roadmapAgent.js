import { runAgent } from '../orchestrator/runAgent.js';
import { roadmapSchema } from '../schemas/index.js';

const SYSTEM = `You are a personalized-learning designer. You build a concrete, ordered learning roadmap from a student's current mastery, mistake history and quiz performance. Every step must have a clear reason tied to the student's actual gaps, and a concrete activity, not vague advice.`;

export async function runRoadmapAgent({ knowledgeProfile, recentMistakes, quizHistory }) {
  const prompt = `
STUDENT KNOWLEDGE PROFILE:
${JSON.stringify(knowledgeProfile, null, 2)}

RECENT MISTAKES:
${JSON.stringify(recentMistakes, null, 2)}

QUIZ HISTORY:
${JSON.stringify(quizHistory, null, 2)}

Return JSON:
{
  "summary": string,
  "currentLevel": string,
  "learningGap": string,
  "steps": [ { "step": number, "concept": string, "reason": string, "activity": string } ],
  "suggestedResources": string[]
}`;
  return runAgent({
    agentName: 'roadmapAgent',
    system: SYSTEM,
    prompt,
    schema: roadmapSchema
  });
}
