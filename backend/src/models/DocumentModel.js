import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storedPath: { type: String, required: true },
  mimeType: { type: String },
  status: { type: String, enum: ['uploaded', 'processing', 'ready', 'failed'], default: 'uploaded' },
  summary: { type: String },
  topics: [{ type: String }],
  error: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('DocumentModel', documentSchema, 'documents');
