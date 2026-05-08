import type { LLMAdapter } from './llm-adapter.js';
import { OllamaAdapter } from './ollama-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';

export * from './llm-adapter.js';
export { OllamaAdapter } from './ollama-adapter.js';
export { GeminiAdapter } from './gemini-adapter.js';

export function createAdapter(config: { adapter: 'ollama' | 'gemini'; baseUrl?: string; apiKey?: string }): LLMAdapter {
  if (config.adapter === 'ollama') {
    return new OllamaAdapter(config.baseUrl);
  } else if (config.adapter === 'gemini') {
    return new GeminiAdapter(config.apiKey, config.baseUrl);
  } else {
    throw new Error(`Unknown adapter type: ${config.adapter}`);
  }
}
