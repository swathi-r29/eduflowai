import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import AIConversation from '../models/AIConversation.js';
import AIMessage from '../models/AIMessage.js';
import StudyWorkspace from '../models/StudyWorkspace.js';
import ContentChunk from '../models/ContentChunk.js';
import Video from '../models/Video.js';
import { runStudyTutorAgent } from '../ai/agents/studyTutorAgent.js';
import { runContentSummaryAgent } from '../ai/agents/contentSummaryAgent.js';
import { search } from '../ai/retrieval/vectorStore.js';
import { recordActivity } from '../ai/memory/studentMemory.js';
import mongoose from 'mongoose';

/**
 * SuperMemo-2 (SM-2) Calculation
 * @param {number} quality - User rating 0 (blackout) to 5 (perfect recall)
 * @param {number} repetition - Consecutive successful reviews
 * @param {number} previousInterval - Prior interval in days
 * @param {number} previousEaseFactor - Prior ease factor (default 2.5)
 */
function calculateSM2({ quality, repetition = 0, previousInterval = 0, previousEaseFactor = 2.5 }) {
  let nextRepetition = repetition;
  let nextInterval = previousInterval;
  let nextEaseFactor = previousEaseFactor;

  // 1. Calculate new Ease Factor
  nextEaseFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  // 2. Calculate interval and repetition
  if (quality >= 3) {
    // Correct recall
    if (repetition === 0) {
      nextInterval = 1;
    } else if (repetition === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(previousInterval * nextEaseFactor);
    }
    nextRepetition += 1;
  } else {
    // Failed recall: reset to beginning
    nextRepetition = 0;
    nextInterval = 1;
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + nextInterval);

  return {
    repetition: nextRepetition,
    interval: nextInterval,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    dueDate: nextDueDate
  };
}

export const query = asyncHandler(async (req, res) => {
  const { workspaceId, question, conversationId, socraticMode = false } = req.body;
  if (!workspaceId || !question) throw new ApiError(400, 'workspaceId and question are required');

  let conversation = conversationId
    ? await AIConversation.findById(conversationId)
    : await AIConversation.create({ student: req.user._id, workspace: workspaceId, title: question.slice(0, 60) });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  await AIMessage.create({ conversation: conversation._id, role: 'user', content: question });

  const result = await runStudyTutorAgent({ workspaceId, question, socraticMode });

  await AIMessage.create({
    conversation: conversation._id,
    role: 'assistant',
    content: result.answer,
    sources: result.sources,
    grounded: result.grounded
  });

  await recordActivity({ studentId: req.user._id, type: 'document_question', detail: { question, socraticMode } });

  res.json({ conversationId: conversation._id, ...result });
});

export const getConversation = asyncHandler(async (req, res) => {
  const messages = await AIMessage.find({ conversation: req.params.id }).sort({ createdAt: 1 });
  res.json({ messages });
});

export const generateStudyContent = asyncHandler(async (req, res) => {
  const { workspaceId, mode, topic, sourceId, videoId } = req.body;
  if (!workspaceId || !mode) throw new ApiError(400, 'workspaceId and mode are required');

  const targetId = sourceId || videoId;
  let results = [];

  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
    let srcChunks = await ContentChunk.find({ workspace: workspaceId, sourceId: targetId }).lean();

    if (srcChunks.length === 0) {
      const vid = await Video.findById(targetId);
      if (vid && vid.youtubeUrl) {
        try {
          const { fetchTranscript } = await import('youtube-transcript');
          const rawTrans = await fetchTranscript(vid.youtubeUrl);
          if (rawTrans && rawTrans.length > 0) {
            const fmt = (sec) => {
              const m = Math.floor(sec / 60);
              const s = Math.floor(sec % 60);
              return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };
            let chunks = [];
            let curText = '', curStart = 0, curEnd = 0;
            for (const item of rawTrans) {
              const start = (item.offset || 0) / 1000;
              const duration = (item.duration || 0) / 1000;
              const end = start + duration;
              if (!curText) {
                curStart = start; curText = item.text; curEnd = end;
              } else if (end - curStart <= 45) {
                curText += ' ' + item.text; curEnd = end;
              } else {
                chunks.push({ text: curText, startTime: Math.floor(curStart), endTime: Math.floor(curEnd) });
                curText = item.text; curStart = start; curEnd = end;
              }
            }
            if (curText) chunks.push({ text: curText, startTime: Math.floor(curStart), endTime: Math.floor(curEnd) });

            const dbChunks = chunks.map((c) => ({
              workspace: workspaceId,
              sourceType: 'video',
              sourceId: vid._id,
              sourceName: vid.originalName,
              startTime: c.startTime,
              endTime: c.endTime,
              text: `[${fmt(c.startTime)} - ${fmt(c.endTime)}] ${c.text}`
            }));
            await ContentChunk.insertMany(dbChunks);
            srcChunks = await ContentChunk.find({ workspace: workspaceId, sourceId: targetId }).lean();
          }
        } catch (err) {}
      }
    }

    if (srcChunks.length > 0) {
      const maxChunks = 20;
      let selectedChunks = srcChunks;
      if (srcChunks.length > maxChunks) {
        const step = Math.floor(srcChunks.length / maxChunks);
        selectedChunks = [];
        for (let i = 0; i < srcChunks.length && selectedChunks.length < maxChunks; i += step) {
          selectedChunks.push(srcChunks[i]);
        }
      }
      results = selectedChunks.map((c) => ({ chunk: c, score: 1.0 }));
    }
  }

  if (results.length === 0) {
    results = await search({ workspaceId, query: topic || mode, topK: 20 });
  }

  let context = '';
  if (results.length > 0) {
    context = results.map((r) => `[Source: ${r.chunk.sourceName}] ${r.chunk.text}`).join('\n\n');
  } else {
    const ws = await StudyWorkspace.findById(workspaceId).populate('documents').populate('videos');
    if (ws) {
      const docTexts = (ws.documents || []).map((d) => `[Source: ${d.originalName}]\nSummary: ${d.summary || 'Educational study document.'}`).join('\n\n');
      const vidTexts = (ws.videos || []).map((v) => `[Source: ${v.originalName}]\nSummary: ${v.summary || 'Educational lecture video.'}`).join('\n\n');
      context = [docTexts, vidTexts].filter(Boolean).join('\n\n');
    }
  }

  if (!context.trim()) {
    context = `Educational workspace topic: ${topic || mode || 'General Study'}. Key educational concepts and study guidance.`;
  }

  const content = await runContentSummaryAgent({ mode, context });

  // If flashcards mode, store newly generated cards in StudyWorkspace with SM-2 initialization
  if (mode === 'flashcards' && Array.isArray(content)) {
    const ws = await StudyWorkspace.findById(workspaceId);
    if (ws) {
      const newCards = content.map((c) => ({
        front: c.front || c.question,
        back: c.back || c.answer,
        concept: c.concept || topic || null,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date(),
        lastReviewed: null
      }));
      ws.flashcards.push(...newCards);
      await ws.save();
    }
  }

  res.json({ mode, content });
});

/**
 * Records student flashcard recall feedback and updates SM-2 schedule
 * POST /api/study/flashcard-review
 */
export const reviewFlashcard = asyncHandler(async (req, res) => {
  const { workspaceId, cardId, quality } = req.body;
  if (!workspaceId || !cardId || quality === undefined) {
    throw new ApiError(400, 'workspaceId, cardId, and quality (0-5) are required');
  }

  const ws = await StudyWorkspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const card = ws.flashcards.id(cardId);
  if (!card) throw new ApiError(404, 'Flashcard not found');

  const sm2Result = calculateSM2({
    quality: Number(quality),
    repetition: card.repetition || 0,
    previousInterval: card.interval || 0,
    previousEaseFactor: card.easeFactor || 2.5
  });

  card.repetition = sm2Result.repetition;
  card.interval = sm2Result.interval;
  card.easeFactor = sm2Result.easeFactor;
  card.dueDate = sm2Result.dueDate;
  card.lastReviewed = new Date();

  await ws.save();

  res.json({
    message: 'Card reviewed successfully',
    card: {
      id: card._id,
      interval: card.interval,
      repetition: card.repetition,
      dueDate: card.dueDate,
      easeFactor: card.easeFactor
    }
  });
});

/**
 * Retrieves flashcards scheduled for review today or overdue
 * GET /api/study/flashcards-due/:workspaceId
 */
export const getDueFlashcards = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const ws = await StudyWorkspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const now = new Date();
  const dueCards = (ws.flashcards || []).filter((c) => !c.dueDate || new Date(c.dueDate) <= now);

  res.json({
    total: ws.flashcards.length,
    dueCount: dueCards.length,
    flashcards: dueCards.length > 0 ? dueCards : ws.flashcards
  });
});