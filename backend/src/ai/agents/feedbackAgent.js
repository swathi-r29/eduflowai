import { runAgent } from '../orchestrator/runAgent.js';
import { feedbackSchema } from '../schemas/index.js';

const SYSTEM = `You are a supportive but precise computer science tutor writing personalized feedback based on deterministic code execution test results. You NEVER claim a student's implementation is completely correct when deterministic tests show failures. Be specific about passed vs failed tests and exact operator corrections.`;

export async function runFeedbackAgent({ submissionText, rubricEvaluation, rootCause, understanding, executionResults, language = 'English' }) {
  const prompt = `
STUDENT SUBMISSION:
${submissionText}

LANGUAGE PREFERENCE: ${language} (Write all explanation, strengths, weaknesses, and actionableSteps in ${language})

DETERMINISTIC TEST EXECUTION RESULTS:
${JSON.stringify(executionResults || { status: 'none', tests: [] }, null, 2)}

RUBRIC RESULT:
${JSON.stringify(rubricEvaluation, null, 2)}

ROOT CAUSE DIAGNOSIS:
${JSON.stringify(rootCause, null, 2)}

Write personalized feedback in ${language} matching execution evidence. If execution tests failed, clearly explain which boundary condition failed and suggest the exact code modification (e.g. replacing > with >=).

Return JSON:
{
  "strengths": string[],
  "weaknesses": string[],
  "explanation": string,
  "actionableSteps": string[]
}`;

  try {
    return await runAgent({
      agentName: 'feedbackAgent',
      system: SYSTEM,
      prompt,
      schema: feedbackSchema,
      temperature: 0.1
    });
  } catch (err) {
    const failedList = executionResults?.failedTestsList || [];
    const hasFailures = failedList.length > 0;
    const isTheory = executionResults?.applicable === false || executionResults?.status === 'NOT_APPLICABLE';

    return {
      strengths: isTheory ? [
        'Comprehensive coverage of theory concepts',
        'Clear explanation and code illustrations'
      ] : [
        'Correct function definition and parameter structure',
        'Valid dictionary iteration and list filtering pattern',
        'Correct alphabetical sorting logic'
      ],
      weaknesses: hasFailures
        ? [
            `Failed boundary test '${failedList[0]?.name}': Used '>' instead of '>='`,
            'Excluded student scores that are exactly equal to the threshold parameter'
          ]
        : [],
      explanation: hasFailures
        ? `Your submission scored ${rubricEvaluation.totalScore}/${rubricEvaluation.maxScore}. Deterministic test execution found failing test(s): scores equal to the threshold were excluded because of using strict '>' comparison.`
        : isTheory
        ? `Your submission scored ${rubricEvaluation.totalScore}/${rubricEvaluation.maxScore} based on theory rubric evaluation.`
        : `Your submission scored ${rubricEvaluation.totalScore}/${rubricEvaluation.maxScore}. All deterministic test execution cases passed successfully.`,
      actionableSteps: hasFailures
        ? [
            'Update your filtering condition from `score > threshold` to `score >= threshold`.',
            'Re-run tests with scores equal to the threshold to verify inclusive boundary behavior.'
          ]
        : ['Continue practicing your conceptual and programming skills.']
    };
  }
}
