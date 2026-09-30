import mongoose from 'mongoose';

const learningActivitySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['assignment', 'quiz', 'video_question', 'document_question', 'roadmap_step'], required: true },
  concept: { type: String },
  refId: { type: mongoose.Schema.Types.ObjectId },
  detail: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('LearningActivity', learningActivitySchema);
