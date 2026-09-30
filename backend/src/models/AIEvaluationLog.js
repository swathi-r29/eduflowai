import mongoose from 'mongoose';

const aiEvaluationLogSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  provider: { type: String, required: true },
  model: { type: String },
  agent: { type: String, required: true },
  promptVersion: { type: String, default: 'v1' },
  processingTimeMs: { type: Number },
  status: { type: String, enum: ['success', 'failure', 'fallback'], required: true },
  error: { type: String, default: null },
  tokenUsage: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.model('AIEvaluationLog', aiEvaluationLogSchema);
