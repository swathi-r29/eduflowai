import mongoose from 'mongoose';

// Unified retrieval unit for RAG, covering both document text chunks and
// video transcript chunks. `embedding` stores the raw vector so similarity
// search can run in-process (see ai/retrieval/vectorStore.js). This plays
// the role ChromaDB plays in the original spec; see README for how to swap
// in a real vector database for production scale.
const contentChunkSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true, index: true },
  sourceType: { type: String, enum: ['document', 'video'], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sourceName: { type: String },
  text: { type: String, required: true },
  startTime: { type: Number, default: null },
  endTime: { type: Number, default: null },
  page: { type: Number, default: null },
  embedding: { type: [Number], default: [] }
}, { timestamps: true });

contentChunkSchema.index({ workspace: 1, sourceType: 1 });
// Index for keyword search matching the text field
contentChunkSchema.index({ text: 'text' });

export default mongoose.model('ContentChunk', contentChunkSchema);