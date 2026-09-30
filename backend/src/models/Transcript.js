import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
  text: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Transcript', transcriptSchema);
