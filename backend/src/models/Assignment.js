import mongoose from 'mongoose';

const rubricCriterionSchema = new mongoose.Schema({
  criterion: { type: String, required: true },
  maxPoints: { type: Number, required: true },
  description: { type: String }
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassModel', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  question: { type: String, required: true },
  sampleSolution: { type: String },
  referenceMaterial: { type: String },
  evaluationType: {
    type: String,
    enum: ['PROGRAMMING', 'THEORY', 'ESSAY', 'MIXED'],
    default: 'THEORY'
  },
  language: { type: String, default: null }, // e.g. 'python', 'java', 'javascript'
  targetFunction: { type: String, default: null },
  rubric: { type: [rubricCriterionSchema], default: [] },
  maxScore: { type: Number, required: true, default: 100 },
  dueDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('Assignment', assignmentSchema);
