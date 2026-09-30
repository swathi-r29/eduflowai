import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import StudentKnowledgeProfile from '../models/StudentKnowledgeProfile.js';
import GradingResult from '../models/GradingResult.js';
import QuizAttempt from '../models/QuizAttempt.js';
import ClassModel from '../models/ClassModel.js';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import AIEvaluationLog from '../models/AIEvaluationLog.js';
import { masteryToLevel } from '../ai/agents/knowledgeProfileAgent.js';
import {
  clusterCohortMisconceptions,
  generateRemediationMaterials
} from '../ai/agents/analyticsEnhancementAgent.js';

export const studentProgress = asyncHandler(async (req, res) => {
  const profile = await StudentKnowledgeProfile.findOne({ student: req.params.studentId }).lean();
  const grades = await GradingResult.find({ student: req.params.studentId }).sort({ createdAt: -1 }).limit(20).lean();
  const quizzes = await QuizAttempt.find({ student: req.params.studentId, completedAt: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

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
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([misconception, count]) => ({ misconception, count }));

  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.aiScore / (g.aiMaxScore || 100)) * 100, 0) / grades.length)
    : 0;

  res.json({
    className: cls?.name,
    studentCount: cls?.students?.length || 0,
    avgScorePct: avgScore,
    commonMisconceptions,
    gradedCount: grades.length
  });
});

/**
 * Cohort Misconception Clustering Endpoint
 * GET /api/analytics/classes/:classId/cohort-clusters
 */
export const getCohortMisconceptionClusters = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { assignmentId } = req.query;

  const cls = await ClassModel.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  let assignmentFilter = {};
  if (assignmentId) {
    assignmentFilter = { _id: assignmentId };
  } else {
    const classAssignments = await Assignment.find({ class: classId }).select('_id');
    assignmentFilter = { $in: classAssignments.map((a) => a._id) };
  }

  const assignments = await Assignment.find({ class: classId, ...assignmentFilter });
  const assignmentIds = assignments.map((a) => a._id);

  const gradingResults = await GradingResult.find({ assignment: { $in: assignmentIds } })
    .populate('student', 'name email')
    .lean();

  const studentErrors = [];
  for (const g of gradingResults) {
    if (g.rootCause && g.rootCause.detectedMisconception && g.rootCause.errorCategory !== 'NONE') {
      studentErrors.push({
        studentId: String(g.student?._id || g.student),
        studentName: g.student?.name || 'Student',
        assignmentId: String(g.assignment),
        misconception: g.rootCause.detectedMisconception,
        category: g.rootCause.errorCategory,
        snippet: g.rootCause.problematicSnippet
      });
    }
  }

  const primaryTitle = assignments[0]?.title || 'Class Assignments';
  const clusteredData = await clusterCohortMisconceptions({
    assignmentTitle: primaryTitle,
    studentErrors
  });

  res.json({
    classId,
    totalGraded: gradingResults.length,
    ...clusteredData
  });
});

/**
 * One-Click Remediation Material Builder Endpoint
 * POST /api/analytics/classes/:classId/remediation-material
 */
export const createRemediationMaterial = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { assignmentId } = req.body;

  let assignmentTitle = 'Course Concepts';
  let gradingQuery = {};

  if (assignmentId) {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    assignmentTitle = assignment.title;
    gradingQuery = { assignment: assignmentId };
  } else {
    const classAssignments = await Assignment.find({ class: classId }).select('_id');
    gradingQuery = { assignment: { $in: classAssignments.map((a) => a._id) } };
  }

  const results = await GradingResult.find(gradingQuery).lean();
  const misconceptions = results
    .map((r) => r.rootCause?.detectedMisconception)
    .filter(Boolean);

  // Group top 3 frequent misconceptions
  const counts = {};
  for (const m of misconceptions) {
    counts[m] = (counts[m] || 0) + 1;
  }
  const topMisconceptions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([misconception, count]) => ({
      misconception,
      count,
      percentage: Math.round((count / (results.length || 1)) * 100)
    }));

  const materials = await generateRemediationMaterials({
    assignmentTitle,
    topMisconceptions
  });

  res.json({
    classId,
    assignmentTitle,
    remediationMaterials: materials
  });
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
  const avgLatency = totalCalls
    ? Math.round(logs.reduce((s, l) => s + (l.processingTimeMs || 0), 0) / totalCalls)
    : 0;

  res.json({
    userCount,
    teacherCount,
    studentCount,
    aiUsage: { totalCalls, failureCount, fallbackCount, avgLatencyMs: avgLatency }
  });
});