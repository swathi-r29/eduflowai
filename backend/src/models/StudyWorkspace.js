import mongoose from 'mongoose';

const studyWorkspaceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentModel' }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
}, { timestamps: true });

export default mongoose.model('StudyWorkspace', studyWorkspaceSchema);
