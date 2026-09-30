import { v4 as uuidv4 } from 'uuid';
import AIEvaluationLog from '../../models/AIEvaluationLog.js';
import { isDbConnected } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

/**
 * Records every AI call for observability (spec section 33). Never logs
 * API keys or raw secrets — only agent name, provider, timing and status.
 */
export async function logAICall({ provider, model, agent, promptVersion = 'v1', processingTimeMs, status, error = null, tokenUsage = null }) {
  const requestId = uuidv4();
  const entry = { requestId, provider, model, agent, promptVersion, processingTimeMs, status, error, tokenUsage };
  if (isDbConnected()) {
    try {
      await AIEvaluationLog.create(entry);
    } catch (e) {
      logger.error('Failed to persist AI evaluation log', e.message);
    }
  } else {
    logger.debug('AI call (not persisted, DB offline):', entry);
  }
  return requestId;
}
