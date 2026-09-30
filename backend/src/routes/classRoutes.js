import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createClass, listClasses, joinClass, getClass } from '../controllers/classController.js';

const router = Router();
router.use(requireAuth);
router.post('/', requireRole('teacher'), createClass);
router.get('/', listClasses);
router.post('/join', requireRole('student'), joinClass);
router.get('/:id', getClass);

export default router;
