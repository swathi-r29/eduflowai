import mongoose from 'mongoose';

const importantTimestampSchema = new mongoose.Schema(
  {
    timestamp: { type: String, default: '00:00' },
    startTime: { type: Number, default: 0 },
    endTime: { type: Number, default: 60 },
    topic: { type: String, default: 'Key Moment' },
    description: { type: String, default: '' },
    // Micro-clip fields (30-60s looping snippet)
    clipStartTime: { type: Number, default: 0 },
    clipEndTime: { type: Number, default: 60 },
    clipDuration: { type: Number, default: 60 },
    conceptPrinciple: { type: String, default: '' } // 2-sentence explanation of concept taught in this clip
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedPath: { type: String, required: false, default: '' },
    youtubeUrl: { type: String, default: null },
    mimeType: { type: String },
    status: {
      type: String,
      enum: [
        'uploading',
        'processing',
        'extracting_audio',
        'transcribing',
        'understanding',
        'indexing',
        'ready',
        'failed'
      ],
      default: 'uploading'
    },
    durationSeconds: { type: Number },
    summary: { type: String },
    topics: [{ type: String }],
    concepts: [{ type: String }],
    keyPoints: [{ type: String }],
    importantTimestamps: { type: [importantTimestampSchema], default: [] },
    error: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model('Video', videoSchema);