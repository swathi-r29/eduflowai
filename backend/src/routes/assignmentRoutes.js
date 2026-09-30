import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  saveCalibrationExamples
} from '../controllers/assignmentController.js';

const router = Router();
router.use(requireAuth);
router.post('/', requireRole('teacher', 'admin'), createAssignment);
router.post('/:id/calibrate', requireRole('teacher', 'admin'), saveCalibrationExamples);
router.get('/', listAssignments);
router.get('/class/:classId', listAssignments);
router.get('/:id', getAssignment);

export default router;

