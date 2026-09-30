import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadDocument as uploadDocumentMw } from '../middleware/upload.js';
import { uploadDocument, getDocument, getJob } from '../controllers/documentController.js';

const router = Router();
router.use(requireAuth, requireRole('student'));
router.post('/upload', uploadDocumentMw.single('file'), uploadDocument);
router.get('/jobs/:jobId', getJob);
router.get('/:id', getDocument);

export default router;
