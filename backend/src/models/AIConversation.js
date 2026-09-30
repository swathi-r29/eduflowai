import mongoose from 'mongoose';

const aiConversationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true },
  title: { type: String, default: 'New conversation' }
}, { timestamps: true });

export default mongoose.model('AIConversation', aiConversationSchema);
