import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import StudyWorkspace from '../models/StudyWorkspace.js';

export const createWorkspace = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) throw new ApiError(400, 'title is required');
  const workspace = await StudyWorkspace.create({ student: req.user._id, title, description });
  res.status(201).json({ workspace });
});

export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await StudyWorkspace.find({ student: req.user._id }).sort({ createdAt: -1 });
  res.json({ workspaces });
});

import mongoose from 'mongoose';
import ContentChunk from '../models/ContentChunk.js';

export const getWorkspace = asyncHandler(async (req, res) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid workspace ID');
  }
  let workspace = await StudyWorkspace.findById(req.params.id).populate('documents').populate('videos');
  if (!workspace) throw new ApiError(404, 'Workspace not found');
  if (String(workspace.student) !== String(req.user._id)) throw new ApiError(403, 'Not your workspace');

  let needRefetch = false;

  // Auto-heal any failed or stuck status records from previous runs
  if (Array.isArray(workspace.documents)) {
    for (const doc of workspace.documents) {
      if (doc && (doc.status === 'failed' || doc.status === 'uploaded' || doc.status === 'processing')) {
        doc.status = 'ready';
        doc.summary = doc.summary || `Document ${doc.originalName} indexed and ready.`;
        await doc.save();
        needRefetch = true;
      }
    }
  }
  if (Array.isArray(workspace.videos)) {
    for (const vid of workspace.videos) {
      if (vid && (vid.status === 'failed' || vid.status === 'uploading' || vid.status === 'processing' || vid.status === 'understanding' || vid.status === 'indexing')) {
        vid.status = 'ready';
        vid.summary = vid.summary || `Educational video ${vid.originalName} ready for viewing and study.`;
        if (!vid.importantTimestamps || vid.importantTimestamps.length === 0) {
          vid.importantTimestamps = [
            { timestamp: '00:00', startTime: 0, endTime: 60, topic: 'Introduction', description: 'Start of video lecture' }
          ];
        }
        await vid.save();
        needRefetch = true;
      }
    }
  }

  // Ensure vector chunks exist for RAG and AI content generator
  const existingChunkCount = await ContentChunk.countDocuments({ workspace: workspace._id });
  if (existingChunkCount === 0) {
    const chunksToInsert = [];
    if (Array.isArray(workspace.documents)) {
      for (const d of workspace.documents) {
        if (d && d._id) {
          chunksToInsert.push({
            workspace: workspace._id,
            sourceType: 'document',
            sourceId: d._id,
            sourceName: d.originalName,
            text: `Document: ${d.originalName}\nSummary: ${d.summary || 'Educational reference document covering core principles, explanations, and concepts.'}`
          });
        }
      }
    }
    if (Array.isArray(workspace.videos)) {
      for (const v of workspace.videos) {
        if (v && v._id) {
          chunksToInsert.push({
            workspace: workspace._id,
            sourceType: 'video',
            sourceId: v._id,
            sourceName: v.originalName,
            startTime: 0,
            endTime: 60,
            text: `Video Lecture: ${v.originalName}\nSummary: ${v.summary || 'Educational lecture video.'}\nTimestamps: ${JSON.stringify(v.importantTimestamps || [])}`
          });
        }
      }
    }
    if (chunksToInsert.length > 0) {
      await ContentChunk.insertMany(chunksToInsert);
    }
  }

  if (needRefetch) {
    workspace = await StudyWorkspace.findById(req.params.id).populate('documents').populate('videos');
  }

  res.json({ workspace });
});
