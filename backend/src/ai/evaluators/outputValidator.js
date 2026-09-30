import { logger } from '../../utils/logger.js';

/**
 * Parses raw LLM text as JSON and validates it against a Zod schema.
 * Implements the "repair" loop from spec section 34/35: strip markdown
 * fences, retry the parse, and only then signal failure so the orchestrator
 * can fall back to the other provider.
 */
export function parseAndValidate(rawText, zodSchema) {
  const cleaned = stripFences(rawText);
  let json;
  try {
    json = JSON.parse(cleaned);
  } catch (err) {
    return { success: false, error: `JSON parse failed: ${err.message}`, raw: rawText };
  }
  const result = zodSchema.safeParse(json);
  if (!result.success) {
    logger.warn('Schema validation failed', result.error.flatten());
    return { success: false, error: 'Schema validation failed', details: result.error.flatten(), raw: rawText };
  }
  return { success: true, data: result.data };
}

function stripFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}
