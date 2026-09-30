import { jest, describe, test, expect } from '@jest/globals';
import { executePythonCode } from '../src/executors/pythonExecutor.js';
import { generateTestCasesForAssignment } from '../src/ai/agents/testGenerationAgent.js';
import { runAssessmentPipeline } from '../src/ai/orchestrator/assessmentOrchestrator.js';
import { classifyAssignmentType } from '../src/controllers/assignmentController.js';

jest.setTimeout(120000);

describe('EduFlow AI Grading Pipeline Architecture Tests', () => {
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
  }, 120000);

  test('TEST 2: Java THEORY assignment MUST NOT run dynamic code execution', async () => {
    const testSuite = await generateTestCasesForAssignment(javaTheoryAssignment);
    expect(testSuite.applicable).toBe(false);
    expect(testSuite.functionName).toBeNull();
    expect(testSuite.testCases).toEqual([]);

    const correctTheoryAnswer = `
Runtime polymorphism in Java is a process in which a call to an overridden method is resolved at runtime rather than at compile-time. It is achieved through method overriding, where a subclass provides a specific implementation of a method declared in its superclass.

For example:
class Animal {
    void makeSound() {
        System.out.println("Animal makes a sound");
    }
}
class Dog extends Animal {
    @Override
    void makeSound() {
        System.out.println("Dog barks");
    }
}
public class Main {
    public static void main(String[] args) {
        Animal myDog = new Dog();
        myDog.makeSound(); // Outputs: Dog barks
    }
}

Method Overriding vs Method Overloading:
1. Method Overriding occurs between sub and super classes with identical method signatures at runtime.
2. Method Overloading occurs within the same class with identical method names but different parameters at compile time.
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

    // Verify execution results: NOT_APPLICABLE
    expect(gradingResult.executionResults.applicable).toBe(false);
    expect(gradingResult.executionResults.status).toBe('NOT_APPLICABLE');
    expect(gradingResult.failedTests).toEqual([]);

    // Verify static analysis: N/A for theory
    expect(gradingResult.staticAnalysis.applicable).toBe(false);
    expect(gradingResult.staticAnalysis.functionName).toBe('N/A');

    // Verify Rubric Scores: 40/40, 30/30, 30/30 = 100/100
    expect(gradingResult.rubricEvaluation.totalScore).toBe(100);
    expect(gradingResult.aiScore).toBe(100);

    // Verify criterion-specific evidence is non-empty and unique per criterion
    const evidenceList = gradingResult.rubricEvaluation.criteriaScores.map((c) => c.evidence);
    expect(evidenceList.length).toBe(3);
    evidenceList.forEach((ev) => expect(ev.length).toBeGreaterThan(0));
  }, 120000);

  test('TEST 3: Incorrect theory answer MUST STILL NOT run dynamic execution and score via rubric', async () => {
    const poorTheoryAnswer = `Polymorphism is when java runs code. Overloading is different.`;
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
  }, 120000);

  test('TEST 4: Submitting Python assignment after Java theory assignment isolates configuration', async () => {
    // 1. Submit Java Theory
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

    // 2. Submit Python Programming immediately after
    const pythonSubmission = {
      _id: '507f1f77bcf86cd799439077',
      student: '507f1f77bcf86cd799439033',
      answerText: 'def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score >= threshold])'
    };
    const resPython = await runAssessmentPipeline({
      submission: pythonSubmission,
      assignment: pythonProgrammingAssignment
    });

    // Must correctly use Python configuration and NOT inherit Java theory N/A state
    expect(resPython.gradingResult.executionResults.applicable).toBe(true);
    expect(resPython.gradingResult.executionResults.status).toBe('passed');
    expect(resPython.gradingResult.staticAnalysis.functionName).toBe('find_top_students');
  }, 240000);

  test('TEST 5: Submitting Java theory assignment after Python programming assignment does NOT inherit Python metadata', async () => {
    // 1. Submit Python Programming
    const pySub = {
      _id: '507f1f77bcf86cd799439088',
      student: '507f1f77bcf86cd799439033',
      answerText: 'def find_top_students(scores, threshold):\n    return sorted([name for name, score in scores.items() if score > threshold])'
    };
    await runAssessmentPipeline({
      submission: pySub,
      assignment: pythonProgrammingAssignment
    });

    // 2. Submit Java Theory
    const javaSub = {
      _id: '507f1f77bcf86cd799439099',
      student: '507f1f77bcf86cd799439033',
      answerText: 'Runtime polymorphism in Java resolves methods at runtime.'
    };
    const resJava = await runAssessmentPipeline({
      submission: javaSub,
      assignment: javaTheoryAssignment
    });

    // Must NOT inherit Python 3.11, find_top_students, or 6 boundary tests
    expect(resJava.gradingResult.executionResults.applicable).toBe(false);
    expect(resJava.gradingResult.executionResults.status).toBe('NOT_APPLICABLE');
    expect(resJava.gradingResult.staticAnalysis.functionName).toBe('N/A');
    expect(resJava.gradingResult.failedTests).toEqual([]);
  }, 240000);

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
