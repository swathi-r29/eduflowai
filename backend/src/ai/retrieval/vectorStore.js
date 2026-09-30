import mongoose from 'mongoose';
import ContentChunk from '../../models/ContentChunk.js';
import { generateEmbedding } from './embeddingService.js';
import { logger } from '../../utils/logger.js';

/**
 * Persist generated chunks and embeddings to MongoDB
 */
export async function upsertChunks(chunks = []) {
  if (!chunks || !chunks.length) return [];

  const operations = chunks.map((chunk) => {
    const chunkData = {
      workspace: chunk.workspace || chunk.workspaceId,
      sourceType: chunk.sourceType || 'document',
      sourceId: chunk.sourceId || chunk.documentId,
      sourceName: chunk.sourceName || '',
      text: chunk.text || chunk.content || '',
      embedding: chunk.embedding,
      startTime: chunk.startTime ?? chunk.timestamp ?? null,
      endTime: chunk.endTime ?? null,
      page: chunk.page ?? chunk.pageNumber ?? null
    };

    if (chunk._id) {
      return {
        updateOne: {
          filter: { _id: chunk._id },
          update: { $set: chunkData },
          upsert: true
        }
      };
    }

    return {
      insertOne: {
        document: chunkData
      }
    };
  });

  return await ContentChunk.bulkWrite(operations);
}

/**
 * Native MongoDB Atlas Vector Search
 */
export async function searchSimilarChunks({ queryVector, workspaceId, topK = 5, minScore = 0.55 }) {
  if (!queryVector || !queryVector.length) {
    return [];
  }

  const workspaceObjectId = typeof workspaceId === 'string'
    ? new mongoose.Types.ObjectId(workspaceId)
    : workspaceId;

  // Retrieve more candidates than topK so minScore threshold filtering doesn't deplete results
  const candidateLimit = Math.max(topK * 4, 20);

  const pipeline = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryVector,
        numCandidates: candidateLimit,
        limit: candidateLimit,
        filter: {
          workspace: workspaceObjectId
        }
      }
    },
    {
      $project: {
        _id: 1,
        text: 1,
        content: '$text',
        sourceType: 1,
        sourceId: 1,
        sourceName: 1,
        workspace: 1,
        page: 1,
        pageNumber: '$page',
        startTime: 1,
        timestamp: '$startTime',
        endTime: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    },
    {
      $match: {
        score: { $gte: minScore }
      }
    },
    {
      $limit: topK
    }
  ];

  try {
    return await ContentChunk.aggregate(pipeline);
  } catch (err) {
    logger.warn(`Atlas $vectorSearch failed, falling back to text search: ${err.message}`);
    return [];
  }
}

/**
 * Keyword match search using MongoDB text index
 */
export async function searchKeywordChunks({ queryText, workspaceId, limit = 5 }) {
  if (!queryText || !queryText.trim()) {
    return [];
  }

  const workspaceObjectId = typeof workspaceId === 'string'
    ? new mongoose.Types.ObjectId(workspaceId)
    : workspaceId;

  try {
    const results = await ContentChunk.find(
      {
        workspace: workspaceObjectId,
        $text: {$search: queryText }
      },
      {
        score: { $meta: 'textScore' },
        text: 1,
        sourceType: 1,
        sourceId: 1,
        sourceName: 1,
        workspace: 1,
        page: 1,
        startTime: 1,
        endTime: 1
      }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    return results.map((item) => ({
      ...item,
      content: item.text,
      pageNumber: item.page,
      timestamp: item.startTime,
      score: item.score || 0
    }));
  } catch (err) {
    logger.warn(`MongoDB $text search failed: ${err.message}`);
    return [];
  }
}

/**
 * Lightweight token overlap and code term re-ranker
 */
function computeLexicalRelevance(text = '', query = '') {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!queryTerms.length || !text) return 0;

  const textLower = text.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) {
    if (textLower.includes(term)) {
      matches += 1;
    }
  }
  return matches / queryTerms.length;
}

/**
 * Hybrid retrieval combining Vector Search and Text Search via Reciprocal Rank Fusion (RRF)
 * with lexical re-ranking
 */
export async function hybridRetrieve({ queryText, queryVector, workspaceId, limit = 5, minScore = 0.015 }) {
  let vector = queryVector;

  // Auto-generate vector if only query text is provided
  if ((!vector || !vector.length) && queryText) {
    try {
      vector = await generateEmbedding(queryText);
    } catch (e) {
      logger.warn(`Failed to generate query embedding for hybrid search: ${e.message}`);
      vector = null;
    }
  }

  const [vectorMatches, textMatches] = await Promise.all([
    vector ? searchSimilarChunks({ queryVector: vector, workspaceId, topK: limit * 3, minScore: 0.45 }) : [],
    queryText ? searchKeywordChunks({ queryText, workspaceId, limit: limit * 3 }) : []
  ]);

  const k = 60;
  const scores = new Map();

  const rankResults = (items, weight = 1.0) => {
    items.forEach((item, index) => {
      const id = item._id.toString();
      const rrfScore = (1 / (k + (index + 1))) * weight;
      if (!scores.has(id)) {
        scores.set(id, { item, totalScore: 0, rrfScore: 0 });
      }
      const entry = scores.get(id);
      entry.rrfScore += rrfScore;
      entry.totalScore += rrfScore;
    });
  };

  rankResults(vectorMatches, 1.2); // slight preference to semantic density
  rankResults(textMatches, 1.0);

  // Apply lexical re-ranking boost
  for (const entry of scores.values()) {
    if (queryText) {
      const lexicalBoost = computeLexicalRelevance(entry.item.text, queryText);
      entry.totalScore += lexicalBoost * 0.02; // boost for exact token matches
    }
  }

  const ranked = Array.from(scores.values())
    .filter((entry) => entry.totalScore >= minScore)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);

  // Format with backward compatibility for both { chunk, score } and direct chunk consumers
  return ranked.map((entry) => {
    const item = entry.item;
    return {
      ...item,
      chunk: item,
      score: Number(entry.totalScore.toFixed(4)),
      rrfScore: Number(entry.rrfScore.toFixed(4))
    };
  });
}

/**
 * Polymorphic search entry point used across orchestrators
 */
export async function search(params) {
  const query = params.query || params.queryText || '';
  const queryVector = params.queryVector || null;
  const workspaceId = params.workspaceId;
  const topK = params.topK || params.limit || 5;

  return await hybridRetrieve({
    queryText: query,
    queryVector,
    workspaceId,
    limit: topK
  });
}

export default {
  upsertChunks,
  search,
  searchSimilarChunks,
  searchKeywordChunks,
  hybridRetrieve
};