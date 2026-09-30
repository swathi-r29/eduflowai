import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';
import GradingResult from '../models/GradingResult.js';
import RevisionPlan from '../models/RevisionPlan.js';
import ClassModel from '../models/ClassModel.js';
import { runAssessmentPipeline } from '../ai/orchestrator/assessmentOrchestrator.js';
import { parseHandwrittenOCR } from '../ai/agents/ocrAgent.js';
import { runPreflightCheck } from '../ai/agents/preflightAgent.js';
import { runConsistencyAudit, generateReTeachPlan } from '../ai/agents/analyticsEnhancementAgent.js';
import { logger } from '../utils/logger.js';

/**
 * 1. Standard Student Submission
 */
export const createSubmission = asyncHandler(async (req, res) => {
  const { assignmentId, answerText } = req.body;
  if (!answerText) throw new ApiError(400, 'answerText is required');
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  const submission = await Submission.create({
    assignment: assignmentId,
    student: req.user._id,
    studentName: req.user.name,
    answerText,
    status: 'submitted'
  });

  res.status(201).json({ submission });

  // Kick off AI evaluation pipeline asynchronously
  submission.status = 'ai_processing';
  await submission.save();
  runAssessmentPipeline({ submission, assignment })
    .then(async () => {
      submission.status = 'ai_evaluated';
      await submission.save();
    })
    .catch(async (err) => {
      logger.error('Assessment pipeline failed:', err.message);
      submission.status = 'submitted';
      await submission.save();
    });
});

/**
 * 1.1 Public Student Portal Submission (No Login Required)
 * POST /api/submissions/public/:assignmentId
 */
export const createPublicSubmission = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { studentName, rollNumber, answerText } = req.body;

  if (!answerText) throw new ApiError(400, 'answerText is required');
  if (!studentName && !rollNumber) throw new ApiError(400, 'studentName or rollNumber is required for public submission');

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  const submission = await Submission.create({
    assignment: assignmentId,
    studentName: studentName || `Student ${rollNumber}`,
    rollNumber: rollNumber || null,
    isPublicSubmission: true,
    answerText,
    status: 'pending'
  });

  res.status(201).json({
    message: 'Public submission received successfully',
    submission
  });

  // Run AI grading pipeline asynchronously
  submission.status = 'ai_processing';
  await submission.save();
  runAssessmentPipeline({ submission, assignment })
    .then(async () => {
      submission.status = 'ai_evaluated';
      await submission.save();
    })
    .catch(async (err) => {
      logger.error('Public assessment pipeline failed:', err.message);
      submission.status = 'submitted';
      await submission.save();
    });
});

/**
 * 1.2 Handwritten OCR Submission
 * POST /api/submissions/ocr
 */
export const ocrSubmission = asyncHandler(async (req, res) => {
  const { assignmentId, imageInput } = req.body;
  if (!assignmentId) throw new ApiError(400, 'assignmentId is required');
  if (!imageInput) throw new ApiError(400, 'imageInput (base64 string or image URL) is required');

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  // Transcribe handwritten image using Gemini Multimodal Vision
  const ocrResult = await parseHandwrittenOCR({ imageInput });

  const submission = await Submission.create({
    assignment: assignmentId,
    student: req.user?._id || null,
    studentName: req.user?.name || 'Handwritten Submission',
    answerText: ocrResult.transcription,
    ocrProcessed: true,
    rawImageUri: typeof imageInput === 'string' && !imageInput.startsWith('data:') ? imageInput : null,
    status: 'pending'
  });

  res.status(201).json({
    message: 'Handwritten OCR transcription completed',
    submission,
    ocrResult
  });

  // Run AI grading pipeline asynchronously
  submission.status = 'ai_processing';
  await submission.save();
  runAssessmentPipeline({ submission, assignment })
    .then(async () => {
      submission.status = 'ai_evaluated';
      await submission.save();
    })
    .catch(async (err) => {
      logger.error('OCR Assessment pipeline failed:', err.message);
      submission.status = 'submitted';
      await submission.save();
    });
});

/**
 * 1.3 Pre-Flight AI Coach Check
 * POST /api/submissions/preflight
 */
export const preflightCheck = asyncHandler(async (req, res) => {
  const { assignmentId, answerText } = req.body;
  if (!assignmentId || !answerText) throw new ApiError(400, 'assignmentId and answerText are required');

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  const preflightResult = await runPreflightCheck({
    question: assignment.question || assignment.description || assignment.title,
    rubric: assignment.rubric || [],
    draftText: answerText
  });

  res.json({ preflight: preflightResult });
});

/**
 * 2. Trigger AI Grading Pipeline manually
 * POST /api/grading/:id or POST /api/submissions/grading/:id
 */
export const triggerGradingPipeline = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('assignment');
  if (!submission) throw new ApiError(404, 'Submission not found');

  submission.status = 'ai_processing';
  await submission.save();

  const pipelineResult = await runAssessmentPipeline({
    submission,
    assignment: submission.assignment
  });

  submission.status = 'ai_evaluated';
  await submission.save();

  const revisionPlan = await RevisionPlan.findOne({ submission: submission._id, gradingResult: pipelineResult.gradingResult?._id });

  res.json({
    message: 'AI grading pipeline completed',
    submission,
    gradingResult: pipelineResult.gradingResult,
    quizAttempt: pipelineResult.quizAttempt,
    revisionPlan
  });
});

/**
 * 3. Consistency Audit (3-point paraphrase cross-validation)
 * POST /api/grading/audit/:id
 */
export const auditGradingConsistency = asyncHandler(async (req, res) => {
  const gradingResult = await GradingResult.findById(req.params.id).populate('assignment');
  if (!gradingResult) throw new ApiError(404, 'Grading result not found');

  const submission = await Submission.findById(gradingResult.submission);
  const auditResult = await runConsistencyAudit({
    submissionText: submission?.answerText || '',
    rubricEvaluation: gradingResult.rubricEvaluation,
    maxScore: gradingResult.aiMaxScore || 100
  });

  res.json({ audit: auditResult });
});

/**
 * 4. Class Re-Teaching & Peer-Tutoring Generator
 * POST /api/grading/class-reteach/:assignmentId
 */
export const getClassReTeachPlan = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  const results = await GradingResult.find({ assignment: assignmentId }).populate('student', 'name email');
  const studentSummaries = results.map((r) => ({
    studentId: r.student?._id || r.student,
    studentName: r.student?.name || 'Student',
    score: r.aiScore || 0,
    weakConcepts: r.feedback?.weaknesses || []
  }));

  const reTeachPlan = await generateReTeachPlan({
    assignmentTitle: assignment.title,
    studentGradingResults: studentSummaries
  });

  res.json({ reTeachPlan });
});

export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('assignment');
  if (!submission) throw new ApiError(404, 'Submission not found');

  if (req.user?.role === 'student' && String(submission.student) !== String(req.user._id)) {
    throw new ApiError(403, 'Forbidden: You can only view your own submission');
  }

  if (req.user?.role === 'teacher') {
    const cls = await ClassModel.findById(submission.assignment.class);
    if (!cls || String(cls.teacher) !== String(req.user._id)) {
      throw new ApiError(403, 'Forbidden: You can only view submissions for your own class');
    }
  }

  const gradingResult = await GradingResult.findOne({ submission: submission._id });
  const revisionPlan = await RevisionPlan.findOne({ submission: submission._id });
  res.json({ submission, gradingResult, revisionPlan });
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const filter = {};
  const assignmentId = req.query.assignmentId || req.params.assignmentId;
  if (assignmentId) filter.assignment = assignmentId;
  if (req.user?.role === 'student') filter.student = req.user._id;

  if (req.user?.role === 'teacher') {
    const teacherClasses = await ClassModel.find({ teacher: req.user._id }).select('_id');
    const classIds = teacherClasses.map((c) => c._id);
    const teacherAssignments = await Assignment.find({ class: { $in: classIds } }).select('_id');
    const assignmentIds = teacherAssignments.map((a) => a._id);
    if (filter.assignment) {
      if (!assignmentIds.some((id) => String(id) === String(filter.assignment))) {
        return res.json({ submissions: [] });
      }
    } else {
      filter.assignment = { $in: assignmentIds };
    }
  }

  const submissions = await Submission.find(filter).populate('assignment', 'title maxScore').sort({ createdAt: -1 });
  res.json({ submissions });
});

// Teacher AI calibration: accept, edit, or override
export const calibrateGrading = asyncHandler(async (req, res) => {
  const { action, teacherScore, teacherFeedback } = req.body;
  const gradingResult = await GradingResult.findById(req.params.id).populate('assignment');
  if (!gradingResult) throw new ApiError(404, 'Grading result not found');

  if (req.user?.role === 'teacher') {
    const cls = await ClassModel.findById(gradingResult.assignment.class);
    if (!cls || String(cls.teacher) !== String(req.user._id)) {
      throw new ApiError(403, 'Forbidden: You can only calibrate grading for your own class');
    }
  } else if (req.user?.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  if (action === 'accept') {
    gradingResult.teacherScore = gradingResult.aiScore;
    gradingResult.teacherFeedback = gradingResult.feedback?.explanation || '';
    gradingResult.teacherStatus = 'accepted';
  } else if (action === 'edit') {
    gradingResult.teacherScore = teacherScore ?? gradingResult.aiScore;
    gradingResult.teacherFeedback = teacherFeedback ?? gradingResult.feedback?.explanation;
    gradingResult.teacherStatus = 'edited';
  } else if (action === 'override') {
    gradingResult.teacherScore = teacherScore;
    gradingResult.teacherFeedback = teacherFeedback;
    gradingResult.teacherStatus = 'overridden';
  } else {
    throw new ApiError(400, 'action must be accept, edit or override');
  }

  gradingResult.reviewedBy = req.user._id;
  gradingResult.reviewedAt = new Date();
  await gradingResult.save();
  res.json({ gradingResult });
});
