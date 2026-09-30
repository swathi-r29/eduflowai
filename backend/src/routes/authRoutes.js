import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/signup', register);
router.post('/login', login);
router.post('/student-login', login);
router.post('/admin-login', login);
router.get('/me', requireAuth, me);

export default router;
