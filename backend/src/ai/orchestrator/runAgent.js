import { getPrimaryProvider, getFallbackProvider } from '../providers/providerFactory.js';
import { parseAndValidate } from '../evaluators/outputValidator.js';
import { logAICall } from '../evaluators/aiLogger.js';
import { logger } from '../../utils/logger.js';

/**
 * Shared execution path for every structured-output agent (spec section 34/35):
 *
 *   LLM -> JSON parse -> schema validate -> valid? continue : repair-retry
 *        -> still invalid? -> fallback provider -> validate -> throw if that fails too
 *
 * Every attempt is logged via aiLogger for the admin AI-observability dashboard.
 */
export async function runAgent({ agentName, system, prompt, schema, maxTokens = 2048, temperature = 0.3 }) {
  const primary = getPrimaryProvider();
  const attempt = await tryProvider(primary, { agentName, system, prompt, schema, maxTokens, temperature });
  if (attempt.success) return attempt.data;

  logger.warn(`${agentName}: primary provider (${primary.name}) failed, trying fallback`);
  const fallback = getFallbackProvider();
  const fallbackAttempt = await tryProvider(fallback, { agentName, system, prompt, schema, maxTokens, temperature }, true);
  if (fallbackAttempt.success) return fallbackAttempt.data;

  throw new Error(`Agent ${agentName} failed on both providers: ${attempt.error} | ${fallbackAttempt.error}`);
}

async function tryProvider(provider, { agentName, system, prompt, schema, maxTokens, temperature }, isFallback = false) {
  if (!provider) {
    return { success: false, error: 'Provider not configured' };
  }
  const start = Date.now();
  try {
    const { text, usage } = await provider.generateJSON({ system, prompt, maxTokens, temperature });
    const validated = parseAndValidate(text, schema);

    if (validated.success) {
      await logAICall({
        provider: provider.name, model: undefined, agent: agentName,
        processingTimeMs: Date.now() - start, status: isFallback ? 'fallback' : 'success', tokenUsage: usage
      });
      return { success: true, data: validated.data };
    }

    // One repair retry: ask the same provider to fix its own output.
    const repairPrompt = `Your previous response failed validation with this error:\n${JSON.stringify(validated.error || validated.details)}\n\nHere was your response:\n${text}\n\nReturn ONLY corrected valid JSON matching the required schema. No commentary.`;
    const repaired = await provider.generateJSON({ system, prompt: repairPrompt, maxTokens, temperature });
    const revalidated = parseAndValidate(repaired.text, schema);

    if (revalidated.success) {
      await logAICall({
        provider: provider.name, agent: agentName, processingTimeMs: Date.now() - start,
        status: isFallback ? 'fallback' : 'success', tokenUsage: repaired.usage
      });
      return { success: true, data: revalidated.data };
    }

    await logAICall({ provider: provider.name, agent: agentName, processingTimeMs: Date.now() - start, status: 'failure', error: 'validation failed after repair' });
    return { success: false, error: 'validation failed after repair attempt' };
  } catch (err) {
    await logAICall({ provider: provider.name, agent: agentName, processingTimeMs: Date.now() - start, status: 'failure', error: err.message });
    return { success: false, error: err.message };
  }
}
