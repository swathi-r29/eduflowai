import mongoose from 'mongoose';

const importantTimestampSchema = new mongoose.Schema({
  timestamp: String,
  startTime: Number,
  endTime: Number,
  topic: String,
  description: String
}, { _id: false });

const videoSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storedPath: { type: String, required: false, default: '' },
  youtubeUrl: { type: String, default: null },
  mimeType: { type: String },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'extracting_audio', 'transcribing', 'understanding', 'indexing', 'ready', 'failed'],
    default: 'uploading'
  },
  durationSeconds: { type: Number },
  summary: { type: String },
  topics: [{ type: String }],
  concepts: [{ type: String }],
  keyPoints: [{ type: String }],
  importantTimestamps: { type: [importantTimestampSchema], default: [] },
  error: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Video', videoSchema);
