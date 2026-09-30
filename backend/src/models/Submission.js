import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  studentName: { type: String, default: null },
  rollNumber: { type: String, default: null },
  isPublicSubmission: { type: Boolean, default: false },

  answerText: { type: String, required: true },
  ocrProcessed: { type: Boolean, default: false },
  rawImageUri: { type: String, default: null },

  status: { type: String, enum: ['pending', 'submitted', 'ai_processing', 'ai_evaluated', 'teacher_reviewed'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Submission', submissionSchema);
