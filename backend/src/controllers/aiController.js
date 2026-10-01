import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import GradingResult from '../models/GradingResult.js';
import StudentKnowledgeProfile from '../models/StudentKnowledgeProfile.js';
import { runQuizAgent } from '../ai/agents/quizAgent.js';
import { runRoadmapAgent } from '../ai/agents/roadmapAgent.js';
import { getStudentContext } from '../ai/memory/studentMemory.js';
import { masteryToLevel } from '../ai/agents/knowledgeProfileAgent.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AIEvaluationLog from '../models/AIEvaluationLog.js';
import { awardUserXP } from '../utils/gamification.js';

export const getEvaluation = asyncHandler(async (req, res) => {
  const gradingResult = await GradingResult.findOne({ submission: req.params.submissionId });
  if (!gradingResult) throw new ApiError(404, 'No AI evaluation found for this submission yet');
  res.json({ gradingResult });
});

export const generateQuiz = asyncHandler(async (req, res) => {
  const { targetConcept, misconception, context, count, difficulty } = req.body;
  
  // Safely convert targetConcept and misconception to strings
  let concept = 'Python Logic & Concepts';
  if (typeof targetConcept === 'string' && targetConcept.trim()) {
    concept = targetConcept.trim();
  } else if (targetConcept && typeof targetConcept === 'object') {
    concept = targetConcept.title || targetConcept.concept || targetConcept.name || 'General Concept Practice';
  }

  let miscText = 'N/A';
  if (typeof misconception === 'string' && misconception.trim()) {
    miscText = misconception.trim();
  } else if (misconception && typeof misconception === 'object') {
    miscText = misconception.detectedMisconception || misconception.message || 'N/A';
  }

  const diffLevel = typeof difficulty === 'string' ? difficulty : 'medium';
  const studentId = req.user?._id;

  if (studentId) {
    try {
      // 1. Check if student already completed a quiz for this targetConcept
      const existingCompleted = await QuizAttempt.findOne({
        student: studentId,
        targetConcept: concept,
        completedAt: { $ne: null }
      }).sort({ updatedAt: -1 });

      if (existingCompleted) {
        return res.status(200).json({
          quizAttempt: existingCompleted,
          alreadyCompleted: true
        });
      }

      // 2. Check if student has an active in-progress attempt for this targetConcept
      const inProgress = await QuizAttempt.findOne({
        student: studentId,
        targetConcept: concept,
        completedAt: null
      }).sort({ updatedAt: -1 });

      if (inProgress) {
        return res.status(200).json({
          quizAttempt: inProgress,
          alreadyCompleted: false
        });
      }
    } catch (dbFindErr) {
      // Silently fall through to generate fresh quiz if lookup fails
    }
  }

  let questions = [];
  try {
    const rawQuestions = await runQuizAgent({
      targetConcept: concept,
      misconception: miscText,
      context: typeof context === 'string' ? context : JSON.stringify(context || {}),
      count: count || 4,
      difficulty: diffLevel
    });
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      questions = rawQuestions.map((q) => ({
        question: q.question || q.questionText || `Question about ${concept}`,
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        explanation: q.explanation || `Key concept: ${concept}`,
        difficulty: q.difficulty || diffLevel,
        targetConcept: concept
      }));
    }
  } catch (err) {
    // Fail-safe fallback questions
  }

  if (questions.length === 0) {
    questions = [
      {
        question: `What is the primary objective when implementing ${concept}?`,
        options: [
          `To ensure correct logic, control flow, and expected output types`,
          `To bypass error checking during execution`,
          `To hardcode static return values regardless of inputs`,
          `None of the above`
        ],
        correctAnswerIndex: 0,
        explanation: `${concept} requires proper logical flow and boundary condition handling.`,
        difficulty: diffLevel,
        targetConcept: concept
      },
      {
        question: `Which approach represents best practice when applying ${concept}?`,
        options: [
          `Writing modular code, filtering input parameters, and returning correct values`,
          `Ignoring variable scope and unhandled exceptions`,
          `Relying on side-effects instead of explicit return values`,
          `Avoiding functions altogether`
        ],
        correctAnswerIndex: 0,
        explanation: `Modular functions and explicit filtering ensure reliable execution.`,
        difficulty: diffLevel,
        targetConcept: concept
      }
    ];
  }

  try {
    const attempt = await QuizAttempt.create({
      student: studentId,
      sourceType: 'remediation',
      targetConcept: concept,
      questions
    });
    return res.status(201).json({ quizAttempt: attempt, alreadyCompleted: false });
  } catch (dbErr) {
    return res.status(201).json({
      quizAttempt: {
        _id: 'temp-' + Date.now(),
        student: studentId,
        sourceType: 'remediation',
        targetConcept: concept,
        questions
      },
      alreadyCompleted: false
    });
  }
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body; // array of selected option indices, aligned to questions[]
  const attempt = await QuizAttempt.findById(req.params.id);
  if (!attempt) throw new ApiError(404, 'Quiz attempt not found');
  if (String(attempt.student) !== String(req.user._id)) throw new ApiError(403, 'Not your quiz attempt');

  // If already completed, return existing result without duplicate scoring or XP
  if (attempt.completedAt) {
    return res.json({ quizAttempt: attempt, alreadyCompleted: true });
  }

  let correct = 0;
  attempt.questions.forEach((q, i) => {
    q.studentAnswerIndex = answers[i];
    if (answers[i] === q.correctAnswerIndex) correct += 1;
  });
  attempt.score = Math.round((correct / attempt.questions.length) * 100);
  attempt.completedAt = new Date();
  await attempt.save();

  // Award XP once per completed quiz attempt
  await awardUserXP(req.user._id, 'PRACTICE_QUIZ', String(attempt._id));

  res.json({ quizAttempt: attempt, alreadyCompleted: true });
});

export const generateRoadmap = asyncHandler(async (req, res) => {
  const context = await getStudentContext(req.user._id);
  const roadmap = await runRoadmapAgent(context);
  res.json({ roadmap });
});

export const getStudentProfile = asyncHandler(async (req, res) => {
  const profile = await StudentKnowledgeProfile.findOne({ student: req.params.studentId }).lean();
  const concepts = (profile?.concepts || []).map((c) => ({ ...c, level: masteryToLevel(c.masteryScore) }));
  res.json({ concepts });
});

export const getAdminAIUsage = asyncHandler(async (req, res) => {
  const logs = await AIEvaluationLog.find().sort({ createdAt: -1 }).limit(200).lean();
  const byAgent = {};
  for (const l of logs) {
    byAgent[l.agent] = byAgent[l.agent] || { success: 0, failure: 0, fallback: 0, avgMs: 0, count: 0 };
    const bucket = byAgent[l.agent];
    bucket[l.status] = (bucket[l.status] || 0) + 1;
    bucket.avgMs = (bucket.avgMs * bucket.count + (l.processingTimeMs || 0)) / (bucket.count + 1);
    bucket.count += 1;
  }
  res.json({ recentLogs: logs.slice(0, 50), byAgent });
});
