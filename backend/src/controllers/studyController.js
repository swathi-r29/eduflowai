import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import AIConversation from '../models/AIConversation.js';
import AIMessage from '../models/AIMessage.js';
import { runStudyTutorAgent } from '../ai/agents/studyTutorAgent.js';
import { runContentSummaryAgent } from '../ai/agents/contentSummaryAgent.js';
import { search } from '../ai/retrieval/vectorStore.js';
import { recordActivity } from '../ai/memory/studentMemory.js';

export const query = asyncHandler(async (req, res) => {
  const { workspaceId, question, conversationId } = req.body;
  if (!workspaceId || !question) throw new ApiError(400, 'workspaceId and question are required');

  let conversation = conversationId
    ? await AIConversation.findById(conversationId)
    : await AIConversation.create({ student: req.user._id, workspace: workspaceId, title: question.slice(0, 60) });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  await AIMessage.create({ conversation: conversation._id, role: 'user', content: question });

  const result = await runStudyTutorAgent({ workspaceId, question });

  await AIMessage.create({
    conversation: conversation._id, role: 'assistant', content: result.answer,
    sources: result.sources, grounded: result.grounded
  });

  await recordActivity({ studentId: req.user._id, type: 'document_question', detail: { question } });

  res.json({ conversationId: conversation._id, ...result });
});

export const getConversation = asyncHandler(async (req, res) => {
  const messages = await AIMessage.find({ conversation: req.params.id }).sort({ createdAt: 1 });
  res.json({ messages });
});

import fs from 'fs';
import mongoose from 'mongoose';
import StudyWorkspace from '../models/StudyWorkspace.js';
import ContentChunk from '../models/ContentChunk.js';

export const generateStudyContent = asyncHandler(async (req, res) => {
  const { workspaceId, mode, topic, sourceId, videoId } = req.body;
  if (!workspaceId || !mode) throw new ApiError(400, 'workspaceId and mode are required');

  const targetId = sourceId || videoId;
  let results = [];

  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
    let srcChunks = await ContentChunk.find({ workspace: workspaceId, sourceId: targetId }).lean();

    // Auto-transcribe video if chunks don't exist yet for this specific video
    if (srcChunks.length === 0) {
      const Video = (await import('../models/Video.js')).default;
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
        } catch (err) {
          // Transcript fetch error fallback
        }
      }
    }

    if (srcChunks.length > 0) {
      // Pick top/sampled chunks up to 20 max to avoid oversized prompt payloads
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
  res.json({ mode, content });
});
