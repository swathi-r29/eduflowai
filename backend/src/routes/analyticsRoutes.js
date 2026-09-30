import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  studentProgress,
  classAnalytics,
  adminOverview,
  getCohortMisconceptionClusters,
  createRemediationMaterial
} from '../controllers/analyticsController.js';

const router = Router();
router.use(requireAuth);
router.get('/student/:studentId', studentProgress);
router.get('/class/:classId', requireRole('teacher', 'admin'), classAnalytics);
router.get('/admin/overview', requireRole('admin'), adminOverview);
router.get('/classes/:classId/cohort-clusters', requireRole('teacher', 'admin'), getCohortMisconceptionClusters);
router.post('/classes/:classId/remediation-material', requireRole('teacher', 'admin'), createRemediationMaterial);

export default router;

