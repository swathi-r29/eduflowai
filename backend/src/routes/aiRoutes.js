import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import {
  getEvaluation, generateQuiz, submitQuiz, generateRoadmap, getStudentProfile, getAdminAIUsage
} from '../controllers/aiController.js';

const router = Router();
router.use(requireAuth);
router.get('/evaluation/:submissionId', getEvaluation);
router.post('/generate-quiz', aiLimiter, requireRole('student', 'teacher', 'admin'), generateQuiz);
router.post('/quiz/:id/submit', requireRole('student', 'teacher', 'admin'), submitQuiz);
router.post('/generate-roadmap', aiLimiter, requireRole('student', 'teacher', 'admin'), generateRoadmap);
router.get('/student-profile/:studentId', getStudentProfile);
router.get('/admin/usage', requireRole('admin'), getAdminAIUsage);

export default router;
