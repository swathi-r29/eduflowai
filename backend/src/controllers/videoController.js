import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import Video from '../models/Video.js';
import StudyWorkspace from '../models/StudyWorkspace.js';
import Transcript from '../models/Transcript.js';
import { processVideo } from '../ai/orchestrator/studyOrchestrator.js';
import { enqueue, getJobStatus, registerTaskHandler } from '../jobs/jobQueue.js';

// Register BullMQ task handler
export const TASK_PROCESS_VIDEO = 'PROCESS_VIDEO';
registerTaskHandler(TASK_PROCESS_VIDEO, async ({ videoId }) => {
  return await processVideo(videoId);
});

export const uploadVideo = asyncHandler(async (req, res) => {
  const { workspaceId } = req.body;
  if (!req.file) throw new ApiError(400, 'file is required');
  if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw new ApiError(400, 'Valid workspaceId is required');
  }

  const workspace = await StudyWorkspace.findById(workspaceId);
  if (!workspace) throw new ApiError(404, 'Workspace not found');

  const video = await Video.create({
    workspace: workspaceId,
    owner: req.user._id,
    originalName: req.file.originalname,
    storedPath: req.file.path,
    mimeType: req.file.mimetype,
    status: 'processing',
    summary: `Processing uploaded video ${req.file.originalname}...`
  });

  workspace.videos.push(video._id);
  await workspace.save();

  const jobId = uuidv4();
  await enqueue(jobId, TASK_PROCESS_VIDEO, { videoId: String(video._id) });

  res.status(202).json({ video, jobId });
});

export const addYoutubeVideo = asyncHandler(async (req, res) => {
  const { workspaceId, youtubeUrl, title } = req.body;
  if (!workspaceId || !youtubeUrl) throw new ApiError(400, 'workspaceId and youtubeUrl are required');
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) throw new ApiError(400, 'Valid workspaceId is required');

  const workspace = await StudyWorkspace.findById(workspaceId);
  if (!workspace) throw new ApiError(404, 'Workspace not found');

  const videoName = title?.trim() || `YouTube: ${youtubeUrl.slice(0, 40)}`;

  const video = await Video.create({
    workspace: workspaceId,
    owner: req.user._id,
    originalName: videoName,
    storedPath: '',
    youtubeUrl: youtubeUrl.trim(),
    mimeType: 'video/youtube',
    status: 'processing',
    summary: `Fetching and analyzing YouTube lecture ${videoName}...`,
    importantTimestamps: [
      { timestamp: '00:00', startTime: 0, endTime: 60, topic: 'Introduction', description: 'Start of YouTube video lecture' }
    ]
  });

  workspace.videos.push(video._id);
  await workspace.save();

  const jobId = uuidv4();
  await enqueue(jobId, TASK_PROCESS_VIDEO, { videoId: String(video._id) });

  res.status(202).json({ video, jobId });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  const transcript = await Transcript.find({ video: video._id }).sort({ startTime: 1 });
  res.json({ video, transcript });
});

export const getJob = asyncHandler(async (req, res) => {
  const status = await getJobStatus(req.params.jobId);
  res.json(status);
});