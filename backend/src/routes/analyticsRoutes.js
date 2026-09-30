import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { studentProgress, classAnalytics, adminOverview } from '../controllers/analyticsController.js';

const router = Router();
router.use(requireAuth);
router.get('/student/:studentId', studentProgress);
router.get('/class/:classId', requireRole('teacher', 'admin'), classAnalytics);
router.get('/admin/overview', requireRole('admin'), adminOverview);

export default router;
