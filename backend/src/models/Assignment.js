import mongoose from 'mongoose';

const rubricCriterionSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true },
    maxPoints: { type: Number, required: true },
    description: { type: String }
  },
  { _id: false }
);

const calibrationCriterionScoreSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true },
    score: { type: Number, required: true },
    reasoning: { type: String, default: '' }
  },
  { _id: false }
);

const calibrationExampleSchema = new mongoose.Schema(
  {
    submissionText: { type: String, required: true },
    totalScore: { type: Number, required: true },
    teacherNotes: { type: String, default: '' },
    criteriaScores: { type: [calibrationCriterionScoreSchema], default: [] }
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
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
    language: { type: String, default: null },
    targetFunction: { type: String, default: null },
    rubric: { type: [rubricCriterionSchema], default: [] },
    maxScore: { type: Number, required: true, default: 100 },
    dueDate: { type: Date },
    // Few-Shot Calibration Examples provided by the instructor
    calibrationExamples: {
      type: [calibrationExampleSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', assignmentSchema);