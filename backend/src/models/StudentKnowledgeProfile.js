import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema({
  concept: { type: String, required: true },
  masteryScore: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  commonErrors: [{ type: String }],
  attempts: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const profileSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  concepts: { type: [conceptSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('StudentKnowledgeProfile', profileSchema);
