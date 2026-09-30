import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import {
  query,
  getConversation,
  generateStudyContent,
  reviewFlashcard,
  getDueFlashcards
} from '../controllers/studyController.js';

const router = Router();
router.use(requireAuth, requireRole('student'));
router.post('/query', aiLimiter, query);
router.get('/conversations/:id', getConversation);
router.post('/summarize', aiLimiter, generateStudyContent);
router.post('/generate-quiz', aiLimiter, generateStudyContent);
router.post('/generate-flashcards', aiLimiter, generateStudyContent);
router.post('/flashcard-review', reviewFlashcard);
router.get('/flashcards-due/:workspaceId', getDueFlashcards);

export default router;

