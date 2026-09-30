import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// 1. Mock Mongoose models so the test does not depend on a live MongoDB connection
jest.unstable_mockModule('../src/models/GradingResult.js', () => ({
  default: {
    create: jest.fn(async (doc) => ({ _id: 'mock_grading_id_123', ...doc })),
    findOne: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null)
  }
}));

jest.unstable_mockModule('../src/models/QuizAttempt.js', () => ({
  default: {
    create: jest.fn(async (doc) => ({ _id: 'mock_quiz_id_123', ...doc }))
  }
}));

jest.unstable_mockModule('../src/models/StudentKnowledgeProfile.js', () => ({
  default: {
    findOne: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  }
}));

jest.unstable_mockModule('../src/models/AIEvaluationLog.js', () => ({
  default: {
    create: jest.fn().mockResolvedValue({})
  }
}));

// Standard rubric payload matching what assessmentOrchestrator expects
// Standard rubric payload matching what assessmentOrchestrator and rubricEvaluationAgent expect
const mockRubricPayload = {
  maxScore: 100,
  totalScore: 95,
  overallConfidence: 0.95,
  requiresTeacherReview: false,
  reviewReason: '',
  criteriaScores: [
    {
      criterion: 'Explains runtime polymorphism correctly',
      score: 38,
      maxPoints: 40,
      confidence: 0.95,
      confidenceReason: 'Thorough conceptual explanation provided',
      reasoning: 'Explains dynamic dispatch correctly',
      evidence: 'Runtime polymorphism in Java is a process in which a call to an overridden method is resolved at runtime'
    },
    {
      criterion: 'Provides a valid code example',
      score: 28,
      maxPoints: 30,
      confidence: 0.95,
      confidenceReason: 'Complete compilable code snippet present',
      reasoning: 'Valid Dog and Animal inheritance structure',
      evidence: 'Animal myDog = new Dog(); myDog.makeSound();'
    },
    {
      criterion: 'Distinguishes overriding vs overloading',
      score: 29,
      maxPoints: 30,
      confidence: 0.95,
      confidenceReason: 'Clear comparative analysis',
      reasoning: 'Explains runtime vs compile time differences',
      evidence: 'Method Overriding occurs between sub and super classes with identical method signatures at runtime'
    }
  ],
  evaluatorNotes: 'Strong submission fulfilling all criteria'
};

// 2. Mock runAgent supporting both naming conventions
jest.unstable_mockModule('../src/ai/orchestrator/runAgent.js', () => ({
  runAgent: jest.fn(async ({ agentName }) => {
    switch (agentName) {
      case 'submissionUnderstandingAgent':
      case 'submissionUnderstanding':
        return {
          understoodTask: 'Determine if code or theory fulfills requirements',
          expectedConcepts: ['Runtime Polymorphism', 'Method Overriding'],
          demonstratedConcepts: ['Runtime Polymorphism', 'Method Overriding'],
          missingConcepts: [],
          reasoningSummary: 'Student explains the concepts accurately with code.',
          evidence: ['Method overriding example included']
        };

      case 'testGenerationAgent':
      case 'testGenerator':
        return {
          applicable: true,
          functionName: 'find_top_students',
          testCases: [
            {
              name: 'Basic Case',
              input: { scores: { Alice: 85, Bob: 70 }, threshold: 80 },
              expectedOutput: ['Alice'],
              isEdgeCase: false,
              conceptTested: 'Filtering logic'
            },
            {
              name: 'Boundary Threshold Case',
              input: { scores: { Alice: 85, Bob: 92 }, threshold: 85 },
              expectedOutput: ['Alice', 'Bob'],
              isEdgeCase: true,
              conceptTested: 'Inclusive boundary comparison'
            }
          ]
        };

      case 'rubricEvaluationAgent':
      case 'rubricEvaluator':
        return mockRubricPayload;

      case 'rootCauseAgent':
      case 'rootCause':
        return {
          errorCategory: 'NONE',
          detectedMisconception: 'None detected',
          problematicSnippet: 'N/A',
          expectedConcept: 'Runtime Polymorphism and Boundary Handling',
          studentInterpretation: 'Accurate understanding demonstrated',
          rootReason: 'Correct logic and clear explanation provided',
          confidence: 0.95,
          suggestedFix: 'None required'
        };

      case 'feedbackAgent':
      case 'feedback':
        return {
          overallFeedback: 'Great work on this implementation.',
          strengths: ['Clear logic', 'Correct edge case handling'],
          weaknesses: ['None identified'],
          explanation: 'The student demonstrated complete understanding of the core concepts.',
          actionableSteps: ['Keep code modular']
        };

      case 'quizAgent':
      case 'quiz':
        return {
          questions: [
            {
              question: 'Which keyword in Java indicates method overriding?',
              options: ['@Override', '@Overload', '@Static', '@Virtual'],
              correctAnswer: '@Override',
              explanation: 'The @Override annotation declares that a method overrides a superclass method.'
            }
          ]
        };

      case 'revisionBlueprintAgent':
      case 'revisionPlanAgent':
      case 'revision':
        return {
          prerequisiteGaps: ['Object-Oriented Basics'],
          rootCauseMisconception: 'None detected',
          revisionSteps: [
            {
              stepNumber: 1,
              title: 'Review Overriding vs Overloading',
              description: 'Revisit basic method signature rules in Java.',
              estimatedMinutes: 10,
              practicePrompt: 'Write a class with overloaded methods.'
            }
          ]
        };

      default:
        return mockRubricPayload;
    }
  })
}));

// 3. Mock pythonExecutor including explicit status field
jest.unstable_mockModule('../src/executors/pythonExecutor.js', () => ({
  executePythonCode: jest.fn(async ({ code }) => {
    const isWrong = code && code.includes('> threshold') && !code.includes('>= threshold');
    return {
      status: isWrong ? 'error' : 'passed',
      passed: !isWrong,
      failedTests: isWrong ? 1 : 0,
      totalTests: 2,
      passedTests: isWrong ? 1 : 2,
      executionTimeMs: 10,
      errors: isWrong ? ['Boundary test failed'] : []
    };
  })
}));

// 4. Dynamically import modules after mocks are registered
const { runAssessmentPipeline } = await import('../src/ai/orchestrator/assessmentOrchestrator.js');
const { generateTestCasesForAssignment } = await import('../src/ai/agents/testGenerationAgent.js');
const { executePythonCode } = await import('../src/executors/pythonExecutor.js');
const { classifyAssignmentType } = await import('../src/controllers/assignmentController.js');

describe('EduFlow AI Grading Pipeline Architecture Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pythonProgrammingAssignment = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Find Top Students',
    question: 'Write a Python function called find_top_students(scores, threshold) that takes a dictionary of student names and their test scores (e.g. {"Alice": 85, "Bob": 92}), and returns an alphabetically sorted list of student names whose score is greater than or equal to the given threshold.',
    sampleSolution: 'def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score >= threshold])',
    evaluationType: 'PROGRAMMING',
    language: 'python',
    targetFunction: 'find_top_students',
    rubric: [
      { criterion: 'Logic & Correctness', maxPoints: 40 },
      { criterion: 'Edge Case Handling & Filtering', maxPoints: 30 },
      { criterion: 'Sorting & Proper Return Type', maxPoints: 30 }
    ],
    maxScore: 100
  };

  const javaTheoryAssignment = {
    _id: '507f1f77bcf86cd799439022',
    title: 'Java Runtime Polymorphism Explanation',
    question: 'Explain runtime polymorphism in Java with an example, and describe how method overriding differs from method overloading.',
    sampleSolution: 'Runtime polymorphism in Java occurs when a call to an overridden method is resolved at runtime rather than compile time...',
    evaluationType: 'THEORY',
    language: null,
    targetFunction: null,
    rubric: [
      { criterion: 'Explains runtime polymorphism correctly', maxPoints: 40 },
      { criterion: 'Provides a valid code example', maxPoints: 30 },
      { criterion: 'Distinguishes overriding vs overloading', maxPoints: 30 }
    ],
    maxScore: 100
  };

  test('TEST 1: Python programming assignment MUST run dynamic execution', async () => {
    const testSuite = await generateTestCasesForAssignment(pythonProgrammingAssignment);
    expect(testSuite.applicable).toBe(true);
    expect(testSuite.functionName).toBe('find_top_students');
    expect(testSuite.testCases.length).toBeGreaterThan(0);

    const wrongCode = `def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score > threshold])`;

    const execResult = await executePythonCode({
      code: wrongCode,
      functionName: testSuite.functionName,
      testCases: testSuite.testCases
    });

    expect(execResult.passed).toBe(false);
    expect(execResult.failedTests).toBeGreaterThan(0);
  });

  test('TEST 2: Java THEORY assignment MUST NOT run dynamic code execution', async () => {
    const testSuite = await generateTestCasesForAssignment(javaTheoryAssignment);
    expect(testSuite.applicable).toBe(false);
    expect(testSuite.functionName).toBeNull();
    expect(testSuite.testCases).toEqual([]);

    const correctTheoryAnswer = `
Runtime polymorphism in Java is a process in which a call to an overridden method is resolved at runtime rather than at compile-time. It is achieved through method overriding.
    `;

    const mockSubmission = {
      _id: '507f1f77bcf86cd799439044',
      student: '507f1f77bcf86cd799439033',
      answerText: correctTheoryAnswer
    };

    const { gradingResult } = await runAssessmentPipeline({
      submission: mockSubmission,
      assignment: javaTheoryAssignment
    });

    expect(gradingResult.executionResults.applicable).toBe(false);
    expect(gradingResult.executionResults.status).toBe('NOT_APPLICABLE');
    expect(gradingResult.failedTests).toEqual([]);
    expect(gradingResult.staticAnalysis.applicable).toBe(false);
    expect(gradingResult.staticAnalysis.functionName).toBe('N/A');
    expect(gradingResult.rubricEvaluation.totalScore).toBeGreaterThanOrEqual(80);
    expect(gradingResult.aiScore).toBeGreaterThanOrEqual(80);

    const evidenceList = gradingResult.rubricEvaluation.criteriaScores.map((c) => c.evidence);
    expect(evidenceList.length).toBe(3);
    evidenceList.forEach((ev) => expect(ev && ev.length).toBeGreaterThan(0));
  });

  test('TEST 3: Incorrect theory answer MUST STILL NOT run dynamic execution and score via rubric', async () => {
    const poorTheoryAnswer = `Polymorphism is when java runs code.`;
    const mockSubmission = {
      _id: '507f1f77bcf86cd799439055',
      student: '507f1f77bcf86cd799439033',
      answerText: poorTheoryAnswer
    };

    const { gradingResult } = await runAssessmentPipeline({
      submission: mockSubmission,
      assignment: javaTheoryAssignment
    });

    expect(gradingResult.executionResults.applicable).toBe(false);
    expect(gradingResult.executionResults.status).toBe('NOT_APPLICABLE');
    expect(gradingResult.failedTests).toEqual([]);
    expect(gradingResult.staticAnalysis.functionName).toBe('N/A');
  });

  test('TEST 4: Submitting Python assignment after Java theory isolates configuration', async () => {
    const theorySubmission = {
      _id: '507f1f77bcf86cd799439066',
      student: '507f1f77bcf86cd799439033',
      answerText: 'Runtime polymorphism is method overriding...'
    };
    const resTheory = await runAssessmentPipeline({
      submission: theorySubmission,
      assignment: javaTheoryAssignment
    });
    expect(resTheory.gradingResult.executionResults.applicable).toBe(false);

    const pythonSubmission = {
      _id: '507f1f77bcf86cd799439077',
      student: '507f1f77bcf86cd799439033',
      answerText: 'def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score >= threshold])'
    };
    const resPython = await runAssessmentPipeline({
      submission: pythonSubmission,
      assignment: pythonProgrammingAssignment
    });

    expect(resPython.gradingResult.executionResults.applicable).toBe(true);
    const execStatus = resPython.gradingResult.executionResults.status || (resPython.gradingResult.executionResults.passed ? 'passed' : 'error');
    expect(['passed', 'error', 'partial']).toContain(execStatus);
    expect(resPython.gradingResult.staticAnalysis.functionName).toBe('find_top_students');
  });

  test('TEST 5: Submitting Java theory after Python does NOT inherit Python metadata', async () => {
    const pySub = {
      _id: '507f1f77bcf86cd799439088',
      student: '507f1f77bcf86cd799439033',
      answerText: 'def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score > threshold])'
    };
    await runAssessmentPipeline({
      submission: pySub,
      assignment: pythonProgrammingAssignment
    });

    const javaSub = {
      _id: '507f1f77bcf86cd799439099',
      student: '507f1f77bcf86cd799439033',
      answerText: 'Runtime polymorphism in Java resolves methods at runtime.'
    };
    const resJava = await runAssessmentPipeline({
      submission: javaSub,
      assignment: javaTheoryAssignment
    });

    expect(resJava.gradingResult.executionResults.applicable).toBe(false);
    expect(resJava.gradingResult.executionResults.status).toBe('NOT_APPLICABLE');
    expect(resJava.gradingResult.staticAnalysis.functionName).toBe('N/A');
    expect(resJava.gradingResult.failedTests).toEqual([]);
  });

  test('TEST 6: classifyAssignmentType auto-detects THEORY vs PROGRAMMING', () => {
    expect(classifyAssignmentType({
      question: 'Explain runtime polymorphism in Java with an example',
      sampleSolution: '',
      title: 'Java Theory'
    })).toBe('THEORY');

    expect(classifyAssignmentType({
      question: 'Write a Python function called find_top_students(scores, threshold)',
      sampleSolution: 'def find_top_students(scores, threshold):',
      title: 'Find Top Students'
    })).toBe('PROGRAMMING');
  });
});