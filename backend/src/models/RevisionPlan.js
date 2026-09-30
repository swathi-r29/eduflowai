import mongoose from 'mongoose';

const revisionStepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  estimatedMinutes: { type: Number, default: 15 },
  practicePrompt: { type: String, default: '' }
}, { _id: false });

const revisionPlanSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  gradingResult: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingResult', required: true },

  weakConcepts: [{ type: String }],
  atRiskFlag: { type: Boolean, default: true },
  prerequisiteGaps: [{ type: String }],
  rootCauseMisconception: { type: String, default: '' },
  revisionSteps: [revisionStepSchema],
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('RevisionPlan', revisionPlanSchema);
