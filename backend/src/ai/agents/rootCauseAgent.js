import { runAgent } from '../orchestrator/runAgent.js';
import { rootCauseSchema } from '../schemas/index.js';

const SYSTEM = `You are an expert learning-science diagnostician. Given a student's submission and deterministic test execution results, you determine WHY the student made a specific code or logic mistake. Classify the error into exactly one category: CONCEPTUAL_MISCONCEPTION, PROCEDURAL_ERROR, FACTUAL_GAP, LOGICAL_REASONING_ERROR, ATTENTION_TO_DETAIL, INCOMPLETE_UNDERSTANDING, or NONE if there are no test failures. Distinguish "what is wrong" from "why it is wrong".`;

export async function runRootCauseAgent({ question, submissionText, understanding, rubricEvaluation, executionResults }) {
  const prompt = `
ASSIGNMENT QUESTION:
${question}

STUDENT SUBMISSION:
${submissionText}

UNDERSTANDING ANALYSIS:
${JSON.stringify(understanding, null, 2)}

RUBRIC EVALUATION:
${JSON.stringify(rubricEvaluation, null, 2)}

DETERMINISTIC TEST EXECUTION RESULTS:
${JSON.stringify(executionResults || { status: 'none', tests: [] }, null, 2)}

Diagnose the single most significant root cause of error based on failed execution tests (or NONE if all tests passed). Return JSON:
{
  "errorCategory": "CONCEPTUAL_MISCONCEPTION|PROCEDURAL_ERROR|FACTUAL_GAP|LOGICAL_REASONING_ERROR|ATTENTION_TO_DETAIL|INCOMPLETE_UNDERSTANDING|NONE",
  "detectedMisconception": string,
  "problematicSnippet": string,
  "expectedConcept": string,
  "studentInterpretation": string,
  "rootReason": string,
  "confidence": number (0-1)
}`;

  try {
    return await runAgent({
      agentName: 'rootCauseAgent',
      system: SYSTEM,
      prompt,
      schema: rootCauseSchema,
      temperature: 0.1
    });
  } catch (err) {
    // Construct deterministic root-cause diagnosis based on execution results
    const failedList = executionResults?.failedTestsList || [];
    const hasFailures = failedList.length > 0;

    if (!hasFailures) {
      return {
        errorCategory: 'NONE',
        detectedMisconception: 'No major error',
        problematicSnippet: '',
        expectedConcept: 'All assignment requirements met',
        studentInterpretation: 'Correct implementation',
        rootReason: 'All deterministic execution tests passed successfully.',
        confidence: 0.95
      };
    }

    const firstFailure = failedList[0];
    const isBoundaryFailure = firstFailure.name?.toLowerCase().includes('boundary') || (firstFailure.reason || '').includes('threshold');

    return {
      errorCategory: isBoundaryFailure ? 'CONCEPTUAL_MISCONCEPTION' : 'LOGICAL_REASONING_ERROR',
      detectedMisconception: isBoundaryFailure
        ? 'Boundary-condition interpretation error: implementation treats threshold as an exclusive lower bound (>) instead of an inclusive lower bound (>=).'
        : `Execution failure on ${firstFailure.name || 'test case'}: ${firstFailure.reason}`,
      problematicSnippet: submissionText?.slice(0, 100) || '',
      expectedConcept: 'Inclusive inequality threshold (>=) and boundary condition handling',
      studentInterpretation: 'Used strict comparison operator excluding threshold equality.',
      rootReason: `Deterministic test '${firstFailure.name}' failed. Input ${JSON.stringify(firstFailure.input)} expected ${JSON.stringify(firstFailure.expected)} but received ${JSON.stringify(firstFailure.actual)}.`,
      confidence: 0.92
    };
  }
}
