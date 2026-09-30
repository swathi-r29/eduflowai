import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createWorkspace, listWorkspaces, getWorkspace } from '../controllers/workspaceController.js';

const router = Router();
router.use(requireAuth, requireRole('student'));
router.post('/', createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspace);

export default router;
