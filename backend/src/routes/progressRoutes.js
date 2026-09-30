import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { studentProgress } from '../controllers/analyticsController.js';

const router = Router();
router.use(requireAuth);
router.get('/student/:studentId', studentProgress);
router.get('/:studentId', studentProgress);

export default router;
