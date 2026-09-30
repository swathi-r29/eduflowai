import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listUsers, setUserActive } from '../controllers/userController.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/', listUsers);
router.patch('/:id/active', setUserActive);

export default router;
