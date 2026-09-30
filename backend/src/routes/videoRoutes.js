import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadVideo as uploadVideoMw } from '../middleware/upload.js';
import { uploadVideo, addYoutubeVideo, getVideo, getJob } from '../controllers/videoController.js';

const router = Router();
router.use(requireAuth, requireRole('student'));
router.post('/upload', uploadVideoMw.single('file'), uploadVideo);
router.post('/youtube', addYoutubeVideo);
router.get('/jobs/:jobId', getJob);
router.get('/:id', getVideo);

export default router;
