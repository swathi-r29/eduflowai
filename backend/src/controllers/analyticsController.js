import { asyncHandler } from '../utils/asyncHandler.js';
import StudentKnowledgeProfile from '../models/StudentKnowledgeProfile.js';
import GradingResult from '../models/GradingResult.js';
import QuizAttempt from '../models/QuizAttempt.js';
import ClassModel from '../models/ClassModel.js';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import AIEvaluationLog from '../models/AIEvaluationLog.js';
import { masteryToLevel } from '../ai/agents/knowledgeProfileAgent.js';

export const studentProgress = asyncHandler(async (req, res) => {
  const profile = await StudentKnowledgeProfile.findOne({ student: req.params.studentId }).lean();
  const grades = await GradingResult.find({ student: req.params.studentId }).sort({ createdAt: -1 }).limit(20).lean();
  const quizzes = await QuizAttempt.find({ student: req.params.studentId, completedAt: { $ne: null } }).sort({ createdAt: -1 }).limit(20).lean();

  const overallMastery = profile?.concepts?.length
    ? Math.round(profile.concepts.reduce((s, c) => s + c.masteryScore, 0) / profile.concepts.length)
    : 0;

  res.json({
    overallMastery,
    overallLevel: masteryToLevel(overallMastery),
    concepts: (profile?.concepts || []).map((c) => ({ ...c, level: masteryToLevel(c.masteryScore) })),
    scoreTrend: grades.map((g) => ({ date: g.createdAt, score: g.aiScore, maxScore: g.aiMaxScore })).reverse(),
    quizAccuracyTrend: quizzes.map((q) => ({ date: q.createdAt, score: q.score, concept: q.targetConcept })).reverse()
  });
});

export const classAnalytics = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findById(req.params.classId).lean();
  const assignmentIds = (await Assignment.find({ class: req.params.classId }).select('_id')).map((a) => a._id);
  const grades = await GradingResult.find({ assignment: { $in: assignmentIds } }).lean();

  const misconceptionCounts = {};
  for (const g of grades) {
    const m = g.rootCause?.detectedMisconception;
    if (m) misconceptionCounts[m] = (misconceptionCounts[m] || 0) + 1;
  }
  const commonMisconceptions = Object.entries(misconceptionCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([misconception, count]) => ({ misconception, count }));

  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.aiScore / (g.aiMaxScore || 100)) * 100, 0) / grades.length)
    : 0;

  res.json({ className: cls?.name, studentCount: cls?.students?.length || 0, avgScorePct: avgScore, commonMisconceptions, gradedCount: grades.length });
});

export const adminOverview = asyncHandler(async (req, res) => {
  const [userCount, teacherCount, studentCount, logs] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'teacher' }),
    User.countDocuments({ role: 'student' }),
    AIEvaluationLog.find().sort({ createdAt: -1 }).limit(500).lean()
  ]);

  const totalCalls = logs.length;
  const failureCount = logs.filter((l) => l.status === 'failure').length;
  const fallbackCount = logs.filter((l) => l.status === 'fallback').length;
  const avgLatency = totalCalls ? Math.round(logs.reduce((s, l) => s + (l.processingTimeMs || 0), 0) / totalCalls) : 0;

  res.json({
    userCount, teacherCount, studentCount,
    aiUsage: { totalCalls, failureCount, fallbackCount, avgLatencyMs: avgLatency }
  });
});
