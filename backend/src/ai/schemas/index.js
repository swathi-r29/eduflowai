import { z } from 'zod';

export const submissionUnderstandingSchema = z.object({
  understoodTask: z.boolean(),
  expectedConcepts: z.array(z.string()),
  demonstratedConcepts: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  reasoningSummary: z.string(),
  evidence: z.array(z.string())
});

export const rubricCriterionSchema = z.object({
  criterion: z.string(),
  score: z.number(),
  maxPoints: z.number(),
  reasoning: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1).default(0.9),
  confidenceReason: z.string().optional().default('')
});

export const rubricEvaluationSchema = z.object({
  totalScore: z.number(),
  maxScore: z.number(),
  overallConfidence: z.number().min(0).max(1).default(0.9),
  requiresTeacherReview: z.boolean().default(false),
  reviewReason: z.string().optional().default(''),
  criteriaScores: z.array(rubricCriterionSchema)
});

export const rootCauseSchema = z.object({
  errorCategory: z.enum([
    'CONCEPTUAL_MISCONCEPTION',
    'PROCEDURAL_ERROR',
    'FACTUAL_GAP',
    'LOGICAL_REASONING_ERROR',
    'ATTENTION_TO_DETAIL',
    'INCOMPLETE_UNDERSTANDING',
    'NONE'
  ]),
  detectedMisconception: z.string(),
  problematicSnippet: z.string(),
  expectedConcept: z.string(),
  studentInterpretation: z.string(),
  rootReason: z.string(),
  confidence: z.number().min(0).max(1)
});

export const feedbackSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  explanation: z.string(),
  actionableSteps: z.array(z.string())
});

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  targetConcept: z.string()
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(5)
});

export const roadmapSchema = z.object({
  summary: z.string(),
  currentLevel: z.string(),
  learningGap: z.string(),
  steps: z.array(z.object({
    step: z.number(),
    concept: z.string(),
    reason: z.string(),
    activity: z.string()
  })),
  suggestedResources: z.array(z.string())
});

export const videoUnderstandingSchema = z.object({
  summary: z.string().default('Summary of educational video.'),
  topics: z.array(z.string()).default([]),
  concepts: z.array(z.string()).default([]),
  keyPoints: z.array(z.string()).default([]),
  importantTimestamps: z.array(z.object({
    timestamp: z.string().default('00:00'),
    startTime: z.coerce.number().nullable().optional().default(0),
    endTime: z.coerce.number().nullable().optional().default(60),
    topic: z.string().default('Key Moment'),
    description: z.string().default('')
  })).default([]),
  transcriptChunks: z.array(z.object({
    text: z.string().default('Video segment content'),
    startTime: z.coerce.number().default(0),
    endTime: z.coerce.number().default(60)
  })).default([])
});

export const tutorAnswerSchema = z.object({
  answer: z.string(),
  grounded: z.boolean(),
  sources: z.array(z.object({
    sourceType: z.enum(['document', 'video']),
    sourceId: z.string().nullable().optional(),
    sourceName: z.string(),
    startTime: z.number().nullable().optional(),
    endTime: z.number().nullable().optional(),
    page: z.number().nullable().optional()
  }))
});
