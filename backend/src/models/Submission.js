import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
    studentName: { type: String, default: null },
    rollNumber: { type: String, default: null },
    isPublicSubmission: { type: Boolean, default: false },

    answerText: { type: String, required: true },
    ocrProcessed: { type: Boolean, default: false },
    rawImageUri: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending', 'submitted', 'ai_processing', 'ai_evaluated', 'teacher_reviewed'],
      default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now },

    // Plagiarism & Similarity Tracking
    plagiarism: {
      flagged: { type: Boolean, default: false, index: true },
      maxSimilarity: { type: Number, default: 0 },
      matchedSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
      matchedStudentName: { type: String, default: null },
      checkedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

export default mongoose.model('Submission', submissionSchema);