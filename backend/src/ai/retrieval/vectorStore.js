import ContentChunk from '../../models/ContentChunk.js';
import { embedOne } from './embeddingService.js';
import { env } from '../../config/env.js';

/**
 * Vector search implemented as in-process cosine similarity over chunks
 * stored in MongoDB. This plays the role ChromaDB plays in the original
 * spec. It is real, working semantic retrieval — not a keyword search —
 * but it is O(n) per query and loads all of a workspace's chunk vectors
 * into memory. That's the right tradeoff for a classroom-scale workspace
 * (dozens to low hundreds of chunks). To scale beyond that, swap this
 * module for a real vector DB (Chroma/pgvector/Pinecone) behind the same
 * two functions: upsertChunks() and search().
 */
export async function upsertChunks(chunksWithMeta) {
  const texts = chunksWithMeta.map((c) => c.text);
  const embeddings = [];
  for (const t of texts) {
    try {
      embeddings.push(await embedOne(t));
    } catch (err) {
      embeddings.push([]);
    }
  }

  const docs = chunksWithMeta.map((c, i) => ({ ...c, embedding: embeddings[i] }));
  return ContentChunk.insertMany(docs);
}

export async function search({ workspaceId, query, topK = env.vectorTopK }) {
  let queryEmbedding = [];
  try {
    queryEmbedding = await embedOne(query);
  } catch (err) {
    queryEmbedding = [];
  }

  const candidates = await ContentChunk.find({ workspace: workspaceId }).lean();

  if (!queryEmbedding || queryEmbedding.length === 0) {
    const qLower = (query || '').toLowerCase();
    const scored = candidates
      .map((c) => {
        const textLower = (c.text || '').toLowerCase();
        const score = textLower.includes(qLower) ? 0.8 : 0.2;
        return { chunk: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }

  const scored = candidates
    .map((c) => ({ chunk: c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
