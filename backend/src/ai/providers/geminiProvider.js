import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { env } from '../../config/env.js';
import { AIProvider } from './aiProvider.js';
/**
 * Gemini is the primary provider (spec section 7). It is also the only
 * provider used for native video understanding: Gemini accepts video files
 * directly and can reason over audio+visual content with timestamps, which
 * avoids needing a separate ffmpeg + speech-to-text pipeline.
 */
export class GeminiProvider extends AIProvider {
  constructor() {
    super();
    if (!env.gemini.apiKey) {
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(env.gemini.apiKey);
    }
  }

  get name() {
    return 'gemini';
  }

  _assertConfigured() {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
  }

  async _withRetry(fn, retries = 2, delayMs = 1000) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const msg = err?.message || '';
        const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('FETCH_ERROR');
        if (!isRetryable || attempt === retries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
    throw lastErr;
  }

  async generateJSON({ system, prompt, maxTokens = 2048, temperature = 0.3 }) {
    this._assertConfigured();
    const candidateModels = Array.from(new Set(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', env.gemini.model, 'gemini-flash-latest', 'gemini-3.5-flash'])).filter(Boolean);

    let lastError;
    for (const modelName of candidateModels) {
      try {
        const model = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction: system,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            responseMimeType: 'application/json'
          }
        });
        return await this._withRetry(async () => {
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return { text, raw: result.response, usage: result.response.usageMetadata || null };
        });
      } catch (err) {
        lastError = err;
        const msg = err?.message || '';
        const shouldFailover = msg.includes('404') || msg.includes('Not Found') || msg.includes('no longer available') || msg.includes('not found') || msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('rate-limit') || msg.includes('Too Many Requests') || msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('FETCH_ERROR');
        if (shouldFailover) {
          continue; // Try next model candidate
        }
        throw err;
      }
    }
    throw lastError;
  }

  async generateText({ system, prompt, maxTokens = 2048, temperature = 0.4 }) {
    this._assertConfigured();
    const candidateModels = Array.from(new Set(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', env.gemini.model, 'gemini-flash-latest', 'gemini-3.5-flash'])).filter(Boolean);

    let lastError;
    for (const modelName of candidateModels) {
      try {
        const model = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction: system,
          generationConfig: { maxOutputTokens: maxTokens, temperature }
        });
        return await this._withRetry(async () => {
          const result = await model.generateContent(prompt);
          return { text: result.response.text(), raw: result.response, usage: result.response.usageMetadata || null };
        });
      } catch (err) {
        lastError = err;
        const msg = err?.message || '';
        const shouldFailover = msg.includes('404') || msg.includes('Not Found') || msg.includes('no longer available') || msg.includes('not found') || msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('rate-limit') || msg.includes('Too Many Requests') || msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('FETCH_ERROR');
        if (shouldFailover) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  async understandVideo({ filePath, mimeType, prompt, system }) {
    this._assertConfigured();
    const { GoogleAIFileManager } = await import('@google/generative-ai/server');
    const fileManager = new GoogleAIFileManager(env.gemini.apiKey);
    const uploadResult = await fileManager.uploadFile(filePath, { mimeType });

    // Wait for the file to become ACTIVE before referencing it.
    let file = uploadResult.file;
    while (file.state === 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 3000));
      file = await fileManager.getFile(file.name);
    }
    if (file.state === 'FAILED') {
      throw new Error('Gemini file processing failed for uploaded video');
    }

    const model = this.client.getGenerativeModel({
      model: env.gemini.model,
      systemInstruction: system,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
      { text: prompt }
    ]);
    return { text: result.response.text(), raw: result.response, usage: result.response.usageMetadata || null };
  }

  async embedText(text) {
    this._assertConfigured();
    const model = this.client.getGenerativeModel({ model: env.gemini.embeddingModel });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
