import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
  sourceType: String,
  sourceName: String,
  startTime: Number,
  endTime: Number,
  page: Number
}, { _id: false });

const aiMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: { type: [sourceSchema], default: [] },
  grounded: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('AIMessage', aiMessageSchema);
