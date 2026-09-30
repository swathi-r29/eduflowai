import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswerIndex: Number,
  explanation: String,
  difficulty: String,
  targetConcept: String,
  studentAnswerIndex: { type: Number, default: null }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceType: { type: String, enum: ['remediation', 'video', 'document', 'workspace'], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  targetConcept: { type: String },
  questions: { type: [questionSchema], default: [] },
  score: { type: Number, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
