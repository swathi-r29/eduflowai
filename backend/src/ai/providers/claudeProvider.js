import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { AIProvider, UnsupportedOperationError } from './aiProvider.js';

/**
 * Claude is the optional fallback provider (spec section 7). It's used
 * when Gemini fails, times out, or returns output that fails schema
 * validation after a repair attempt. It does not implement video
 * understanding or embeddings (kept on Gemini for consistency of the
 * vector space) — see UnsupportedOperationError.
 */
export class ClaudeProvider extends AIProvider {
  constructor() {
    super();
    this.client = env.anthropic.apiKey ? new Anthropic({ apiKey: env.anthropic.apiKey }) : null;
  }

  get name() {
    return 'anthropic';
  }

  _assertConfigured() {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
  }

  async generateJSON({ system, prompt, maxTokens = 2048, temperature = 0.3 }) {
    this._assertConfigured();
    const msg = await this.client.messages.create({
      model: env.anthropic.model,
      max_tokens: maxTokens,
      temperature,
      system: `${system}\n\nRespond with ONLY valid JSON. No markdown fences, no commentary.`,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return { text, raw: msg, usage: msg.usage };
  }

  async generateText({ system, prompt, maxTokens = 2048, temperature = 0.4 }) {
    this._assertConfigured();
    const msg = await this.client.messages.create({
      model: env.anthropic.model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return { text, raw: msg, usage: msg.usage };
  }

  async understandVideo() {
    throw new UnsupportedOperationError('Claude provider does not support native video understanding in this app');
  }

  async embedText() {
    throw new UnsupportedOperationError('Claude provider is not used for embeddings in this app (Gemini embeddings only, for a consistent vector space)');
  }
}
