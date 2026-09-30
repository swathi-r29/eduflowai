import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    concept: { type: String, default: null },

    // SuperMemo-2 (SM-2) Spaced Repetition Fields
    repetition: { type: Number, default: 0 },
    interval: { type: Number, default: 0 }, // Interval in days
    easeFactor: { type: Number, default: 2.5 }, // Default EF is 2.5 (min 1.3)
    dueDate: { type: Date, default: Date.now },
    lastReviewed: { type: Date, default: null }
  },
  { _id: true }
);

const studyWorkspaceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentModel' }],
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    flashcards: { type: [flashcardSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('StudyWorkspace', studyWorkspaceSchema);