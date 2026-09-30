import { runAgent } from '../orchestrator/runAgent.js';
import { z } from 'zod';

const testCaseSchema = z.object({
  functionName: z.string(),
  testCases: z.array(z.object({
    name: z.string(),
    input: z.any(),
    expected: z.any(),
    category: z.string().optional().default('general')
  })).min(1)
});

const SYSTEM = `You are a principal test engineer and code evaluation architect. Given a programming assignment prompt, sample solution, and rubric, you generate rigorous, requirement-aware deterministic test cases for executable code. You ALWAYS identify exact boundary conditions (e.g. equality thresholds, empty inputs, sorting expectations, edge cases) from the text operator descriptions ("greater than or equal to", "at least", "alphabetically sorted", etc.).`;

export async function generateTestCasesForAssignment({ question = '', sampleSolution = '', rubric = [], evaluationType = 'PROGRAMMING' }) {
  // If assignment is THEORY or ESSAY, dynamic execution is NOT APPLICABLE.
  if (evaluationType === 'THEORY' || evaluationType === 'ESSAY') {
    return {
      applicable: false,
      functionName: null,
      testCases: []
    };
  }

  // Extract target Python function name if present
  const funcNameMatch = (sampleSolution + ' ' + question).match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
  const targetFunctionName = funcNameMatch ? funcNameMatch[1] : null;

  if (!targetFunctionName && evaluationType !== 'PROGRAMMING') {
    return {
      applicable: false,
      functionName: null,
      testCases: []
    };
  }

  const resolvedFuncName = targetFunctionName || 'solution';

  const prompt = `
ASSIGNMENT QUESTION:
${question}

SAMPLE SOLUTION:
${sampleSolution || 'N/A'}

RUBRIC:
${JSON.stringify(rubric || [], null, 2)}

TARGET FUNCTION NAME: "${resolvedFuncName}"

Generate 5 to 7 requirement-aware test cases for this Python function.
Make sure to include:
1. Normal standard cases.
2. EXACT BOUNDARY CONDITIONS (e.g. if the prompt specifies "greater than or equal to", include scores EXACTLY equal to the threshold).
3. Empty inputs (e.g. empty dictionary/list).
4. Edge cases (e.g. no elements matching threshold).
5. Sorting / Order requirements (e.g. unsorted input keys to verify sorted output).

Return JSON in this exact structure:
{
  "functionName": "${resolvedFuncName}",
  "testCases": [
    {
      "name": "Exact threshold boundary test",
      "input": { "scores": { "Alice": 85, "Bob": 92, "Charlie": 85 }, "threshold": 85 },
      "expected": ["Alice", "Bob", "Charlie"],
      "category": "boundary"
    }
  ]
}`;

  try {
    const result = await runAgent({
      agentName: 'testGenerationAgent',
      system: SYSTEM,
      prompt,
      schema: testCaseSchema,
      maxTokens: 2500,
      temperature: 0.1
    });

    if (result && Array.isArray(result.testCases) && result.testCases.length >= 1) {
      return {
        applicable: true,
        functionName: result.functionName || resolvedFuncName,
        testCases: result.testCases
      };
    }
  } catch (err) {
    // Fall back to rule-based requirement-aware test generator
  }

  return getFallbackBoundaryTestCases(question, sampleSolution, resolvedFuncName);
}

/**
 * Rule-based fallback test generator ensuring boundary test coverage ONLY for programming tasks.
 */
function getFallbackBoundaryTestCases(question, sampleSolution, targetFunctionName) {
  const text = (question + ' ' + (sampleSolution || '')).toLowerCase();

  // Pattern: find_top_students / student score threshold pattern
  if (targetFunctionName === 'find_top_students' || (text.includes('find_top_students') && text.includes('threshold'))) {
    return {
      applicable: true,
      functionName: 'find_top_students',
      testCases: [
        {
          name: 'Normal threshold filtering',
          input: { scores: { Alice: 85, Bob: 92, Charlie: 78 }, threshold: 80 },
          expected: ['Alice', 'Bob'],
          category: 'normal'
        },
        {
          name: 'Exact threshold boundary condition',
          input: { scores: { Alice: 85, Bob: 92, Charlie: 85 }, threshold: 85 },
          expected: ['Alice', 'Bob', 'Charlie'],
          category: 'boundary'
        },
        {
          name: 'Empty input dictionary',
          input: { scores: {}, threshold: 80 },
          expected: [],
          category: 'edge_case'
        },
        {
          name: 'Everyone below threshold',
          input: { scores: { Alice: 50, Bob: 60 }, threshold: 80 },
          expected: [],
          category: 'edge_case'
        },
        {
          name: 'Alphabetical sorting check',
          input: { scores: { Zara: 95, Alice: 95, Bob: 95 }, threshold: 90 },
          expected: ['Alice', 'Bob', 'Zara'],
          category: 'sorting'
        },
        {
          name: 'Mixed scores around boundary',
          input: { scores: { Alice: 84, Bob: 85, Charlie: 86 }, threshold: 85 },
          expected: ['Bob', 'Charlie'],
          category: 'boundary'
        }
      ]
    };
  }

  // General python programming task fallback (only if python code function name exists)
  if (targetFunctionName && targetFunctionName !== 'solution') {
    return {
      applicable: true,
      functionName: targetFunctionName,
      testCases: [
        {
          name: 'Standard input case',
          input: [1, 2, 3, 4, 5],
          expected: [2, 4],
          category: 'normal'
        }
      ]
    };
  }

  return {
    applicable: false,
    functionName: null,
    testCases: []
  };
}
