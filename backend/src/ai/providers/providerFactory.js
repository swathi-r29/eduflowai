import { GeminiProvider } from './geminiProvider.js';
import { ClaudeProvider } from './claudeProvider.js';
import { env } from '../../config/env.js';

const providers = {
  gemini: new GeminiProvider(),
  anthropic: new ClaudeProvider()
};

export function getProvider(name) {
  const p = providers[name];
  if (!p) throw new Error(`Unknown AI provider: ${name}`);
  return p;
}

export function getPrimaryProvider() {
  return getProvider(env.aiPrimaryProvider);
}

export function getFallbackProvider() {
  const other = env.aiPrimaryProvider === 'gemini' ? 'anthropic' : 'gemini';
  if (other === 'anthropic' && !env.anthropic.apiKey) {
    return null;
  }
  if (other === 'gemini' && !env.gemini.apiKey) {
    return null;
  }
  return getProvider(other);
}

export function getVideoProvider() {
  // Only Gemini implements native video understanding in this app.
  return getProvider('gemini');
}

export function getEmbeddingProvider() {
  // Keep all embeddings on one provider/model so vectors are comparable.
  return getProvider('gemini');
}
