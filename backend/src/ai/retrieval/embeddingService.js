import { getEmbeddingProvider } from '../providers/providerFactory.js';

export async function embedOne(text) {
  const provider = getEmbeddingProvider();
  return provider.embedText(text);
}

// Alias for compatibility with analytics & clustering services
export const generateEmbedding = embedOne;

export async function embedMany(texts) {
  const provider = getEmbeddingProvider();
  const out = [];
  // Sequential to stay well within embedding-API rate limits; fine for
  // classroom-scale documents. Batch/parallelize if you outgrow this.
  for (const t of texts) {
    out.push(await provider.embedText(t));
  }
  return out;
}