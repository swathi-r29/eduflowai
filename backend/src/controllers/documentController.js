import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import DocumentModel from '../models/DocumentModel.js';
import StudyWorkspace from '../models/StudyWorkspace.js';
import { processDocument } from '../ai/orchestrator/studyOrchestrator.js';
import { enqueue, getJobStatus } from '../jobs/jobQueue.js';
import { v4 as uuidv4 } from 'uuid';

export const uploadDocument = asyncHandler(async (req, res) => {
  const { workspaceId } = req.body;
  if (!req.file) throw new ApiError(400, 'file is required');
  const workspace = await StudyWorkspace.findById(workspaceId);
  if (!workspace) throw new ApiError(404, 'Workspace not found');

  const doc = await DocumentModel.create({
    workspace: workspaceId, owner: req.user._id, originalName: req.file.originalname,
    storedPath: req.file.path, mimeType: req.file.mimetype, status: 'uploaded'
  });
  workspace.documents.push(doc._id);
  await workspace.save();

  const jobId = uuidv4();
  enqueue(jobId, () => processDocument(doc._id));
  res.status(202).json({ document: doc, jobId });
});

export const getDocument = asyncHandler(async (req, res) => {
  const doc = await DocumentModel.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Document not found');
  res.json({ document: doc });
});

export const getJob = asyncHandler(async (req, res) => {
  res.json(getJobStatus(req.params.jobId));
});
