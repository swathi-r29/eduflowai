/**
 * AIProvider is the abstraction every LLM backend must implement so agents
 * never talk to Gemini or Claude directly. This is what keeps the app from
 * being hard-wired to one vendor (spec section 7).
 *
 * Implementations: geminiProvider.js (primary), claudeProvider.js (fallback).
 */
export class AIProvider {
  /** @returns {string} provider name, e.g. 'gemini' | 'anthropic' */
  get name() {
    throw new Error('not implemented');
  }

  /**
   * Generate a structured JSON response from a prompt.
   * @param {object} opts
   * @param {string} opts.system - system prompt
   * @param {string} opts.prompt - user prompt
   * @param {number} [opts.maxTokens]
   * @param {number} [opts.temperature]
   * @returns {Promise<{text: string, raw: any, usage: any}>}
   */
  async generateJSON(_opts) {
    throw new Error('not implemented');
  }

  /**
   * Generate free-text (used for grounded tutor answers, summaries).
   */
  async generateText(_opts) {
    throw new Error('not implemented');
  }

  /**
   * Understand a video file (native multimodal input) and return a
   * structured description with timestamps. Only Gemini implements this
   * for real; Claude's provider throws UnsupportedOperationError so the
   * orchestrator knows not to fall back to it for video.
   */
  async understandVideo(_opts) {
    throw new Error('not implemented');
  }

  /**
   * Return an embedding vector for a piece of text.
   * @returns {Promise<number[]>}
   */
  async embedText(_text) {
    throw new Error('not implemented');
  }
}

export class UnsupportedOperationError extends Error {}
