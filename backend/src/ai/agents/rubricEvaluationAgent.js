import { runAgent } from '../orchestrator/runAgent.js';
import { rubricEvaluationSchema } from '../schemas/index.js';

const SYSTEM = `You are a rigorous, evidence-based code and theory evaluator. You evaluate student submissions against rubric criteria. For EACH criterion in criteriaScores, the "evidence" field MUST be a unique, specific, direct quote or snippet from the student's submission that specifically addresses that specific criterion. Do NOT repeat the exact same generic text or paragraph across multiple criteria.`;

export async function runRubricEvaluationAgent({ question, rubric, maxScore = 100, submissionText, understanding, executionResults, evaluationType = 'PROGRAMMING' }) {
  const isTheory = evaluationType === 'THEORY' || evaluationType === 'ESSAY';

  const prompt = `
ASSIGNMENT QUESTION:
${question}

ASSIGNMENT TYPE: ${evaluationType}

RUBRIC (criterion, maxPoints):
${JSON.stringify(rubric, null, 2)}

TOTAL MAX SCORE: ${maxScore}

STUDENT SUBMISSION:
${submissionText}

PRIOR UNDERSTANDING ANALYSIS:
${JSON.stringify(understanding, null, 2)}

DETERMINISTIC EXECUTION RESULTS (${isTheory ? 'NOT APPLICABLE FOR THEORY ASSIGNMENT' : 'PRIMARY GROUND TRUTH FOR CORRECTNESS'}):
${JSON.stringify(executionResults || { status: 'none', tests: [] }, null, 2)}

RULES FOR GRADING:
1. ${isTheory ? 'Evaluate the theory response purely on conceptual accuracy, completeness, and clarity of examples.' : 'Use the Deterministic Execution Results as the primary source of truth for executable correctness.'}
2. ${isTheory ? 'If the submission explains concepts correctly and answers all parts of the question, award full points.' : 'If any test in execution results failed (e.g., failed boundary condition), do NOT award full credit for Logic & Correctness or Edge Case Handling.'}
3. CRITICAL EVIDENCE REQUIREMENT: For EACH criterion in criteriaScores, the "evidence" field MUST be a distinct, unique quote or excerpt from the submission text that directly demonstrates THAT specific criterion.
   - For example: if Criterion 1 is about explaining polymorphism, quote the polymorphism definition text.
   - If Criterion 2 is about providing a valid code example, quote the code example snippet.
   - If Criterion 3 is about overriding vs overloading, quote the comparison explanation.

Return JSON matching this exact structure:
{
  "totalScore": number,
  "maxScore": ${maxScore},
  "criteriaScores": [
    { "criterion": string, "score": number, "maxPoints": number, "reasoning": string, "evidence": string }
  ]
}`;

  let evaluation;
  try {
    evaluation = await runAgent({
      agentName: 'rubricEvaluationAgent',
      system: SYSTEM,
      prompt,
      schema: rubricEvaluationSchema,
      temperature: 0.1
    });
  } catch (err) {
    // Construct rule-bounded fallback evaluation
    evaluation = getRuleBoundedRubricEvaluation({ rubric, maxScore, executionResults, submissionText, isTheory });
  }

  // Enforce deterministic scoring policy on the evaluation result:
  // If execution results show test failures, NO correctness criterion can receive 100% full points.
  return applyDeterministicScoreEnforcement({ evaluation, rubric, maxScore, executionResults });
}

/**
 * Enforces strict deterministic caps on LLM rubric scores based on execution evidence.
 */
function applyDeterministicScoreEnforcement({ evaluation, rubric, maxScore, executionResults }) {
  if (!executionResults || executionResults.applicable === false || !Array.isArray(executionResults.tests) || executionResults.tests.length === 0) {
    // For theory or non-executable assignments, ensure totalScore matches sum of criteriaScores
    const totalScore = (evaluation.criteriaScores || []).reduce((sum, c) => sum + (c.score || 0), 0);
    return {
      totalScore: Math.min(totalScore, maxScore || 100),
      maxScore: maxScore || 100,
      criteriaScores: evaluation.criteriaScores || []
    };
  }

  const { totalTests, passedTests, failedTests } = executionResults;
  const passRatio = totalTests > 0 ? passedTests / totalTests : 1.0;
  const hasFailures = failedTests > 0;

  let totalScore = 0;
  const adjustedCriteria = (evaluation.criteriaScores || []).map((c) => {
    const criterionName = c.criterion.toLowerCase();
    const isSortingCriterion = criterionName.includes('sort') || criterionName.includes('order') || criterionName.includes('return type');
    const isLogicOrEdgeCriterion = criterionName.includes('logic') || criterionName.includes('correct') || criterionName.includes('filter') || criterionName.includes('edge');

    let maxCap = c.maxPoints;
    let reasoning = c.reasoning;
    let evidence = c.evidence || '';

    if (hasFailures && isLogicOrEdgeCriterion) {
      // Cap score proportional to test pass ratio (e.g., 5/6 passed -> max 83% of criterion points)
      const ratioCap = Math.floor(c.maxPoints * Math.min(passRatio, 0.75));
      maxCap = Math.min(c.score, ratioCap);

      const failedNames = (executionResults.failedTestsList || [])
        .map((f) => `"${f.name}" (${f.reason || 'Assertion Failed'})`)
        .join('; ');

      reasoning = `Deterministic test execution failed ${failedTests} of ${totalTests} test case(s): ${failedNames}. Full credit cannot be awarded.`;
      evidence = `Failed Test: ${failedNames}`;
    }

    // Check if sorting specifically failed in test cases
    const sortingFailed = (executionResults.failedTestsList || []).some((f) => f.category === 'sorting' || (f.reason || '').toLowerCase().includes('sort'));
    if (sortingFailed && isSortingCriterion) {
      maxCap = Math.floor(c.maxPoints * 0.5);
      reasoning = 'Failed deterministic sorting assertion in test execution.';
    }

    const finalScore = Math.min(c.score, maxCap);
    totalScore += finalScore;

    return {
      criterion: c.criterion,
      score: finalScore,
      maxPoints: c.maxPoints,
      reasoning,
      evidence
    };
  });

  return {
    totalScore: Math.min(totalScore, hasFailures ? Math.floor(maxScore * 0.85) : maxScore),
    maxScore: maxScore || 100,
    criteriaScores: adjustedCriteria
  };
}

function getRuleBoundedRubricEvaluation({ rubric, maxScore, executionResults, submissionText, isTheory = false }) {
  const criteria = rubric && rubric.length > 0 ? rubric : [
    { criterion: 'Logic & Correctness', maxPoints: 40 },
    { criterion: 'Edge Case Handling & Filtering', maxPoints: 30 },
    { criterion: 'Sorting & Proper Return Type', maxPoints: 30 }
  ];

  const isTheoryMode = isTheory || executionResults?.applicable === false || executionResults?.status === 'NOT_APPLICABLE';
  const subLower = (submissionText || '').toLowerCase();

  let calculatedTotal = 0;
  const criteriaScores = criteria.map((r, idx) => {
    const keywords = r.criterion.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchesKeyword = keywords.length === 0 || keywords.some((kw) => subLower.includes(kw));

    let pct = 0;
    let reasoning = '';

    if (isTheoryMode) {
      if (matchesKeyword) {
        pct = 1.0;
        reasoning = 'Theory explanation contains key concepts relevant to this criterion.';
      } else {
        pct = 0.0;
        reasoning = 'Submission does not contain concepts or explanation relevant to this criterion.';
      }
    } else {
      if (executionResults?.passed) {
        pct = 1.0;
        reasoning = 'Passed all test assertions.';
      } else {
        pct = matchesKeyword ? 0.5 : 0.0;
        reasoning = 'Failed 1 or more test assertions.';
      }
    }

    const score = Math.floor(r.maxPoints * pct);
    calculatedTotal += score;

    return {
      criterion: r.criterion,
      score,
      maxPoints: r.maxPoints,
      reasoning,
      evidence: extractCriterionSpecificEvidence(submissionText, r.criterion, idx)
    };
  });

  return applyDeterministicScoreEnforcement({
    evaluation: {
      totalScore: Math.min(calculatedTotal, maxScore),
      maxScore,
      criteriaScores
    },
    rubric: criteria,
    maxScore,
    executionResults
  });
}

function extractCriterionSpecificEvidence(submissionText, criterionName, index) {
  if (!submissionText) return '';
  const paragraphs = submissionText.split(/\n\s*\n+/).filter((p) => p.trim().length > 0);
  const lines = submissionText.split(/\n+/).filter((l) => l.trim().length > 0);

  const keywords = criterionName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  
  // Look for matching paragraph
  for (const para of paragraphs) {
    const pLower = para.toLowerCase();
    if (keywords.some((kw) => pLower.includes(kw))) {
      return para.trim().slice(0, 180);
    }
  }

  // Look for matching line
  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (keywords.some((kw) => lLower.includes(kw))) {
      return line.trim().slice(0, 180);
    }
  }

  // Fallback by index
  if (paragraphs[index]) {
    return paragraphs[index].trim().slice(0, 180);
  }
  if (lines[index]) {
    return lines[index].trim().slice(0, 180);
  }

  return submissionText.slice(0, 180);
}
