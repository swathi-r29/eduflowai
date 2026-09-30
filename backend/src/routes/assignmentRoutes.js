import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createAssignment, listAssignments, getAssignment } from '../controllers/assignmentController.js';

const router = Router();
router.use(requireAuth);
router.post('/', requireRole('teacher', 'admin'), createAssignment);
router.get('/', listAssignments);
router.get('/class/:classId', listAssignments);
router.get('/:id', getAssignment);

export default router;
