import { ChatRole } from './llm-adapter.js';
import type { LLMAdapter, ChatRequest, ChatResponse, ChatMessage, ToolCall } from './llm-adapter.js';

export class OllamaAdapter implements LLMAdapter {
  private baseUrl: string;
  readonly name = 'ollama';

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async health(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const payload: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };

    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools;
    }

    if (request.options) {
      payload.options = request.options;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${text}`);
      }

      const rawBody = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawBody);
      } catch (err) {
        throw new Error(`Ollama API returned malformed JSON: ${rawBody}`);
      }

      const message: ChatMessage = {
        role: data.message?.role as ChatRole || ChatRole.ASSISTANT,
        content: data.message?.content || '',
      };

      if (data.message?.tool_calls) {
        message.tool_calls = data.message.tool_calls.map((tc: any, index: number) => {
          let args = tc.function?.arguments || {};
          if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch (_) { /* ignore */ }
          }
          return {
            id: `call_${Date.now()}_${index}`,
            type: 'function',
            function: {
              name: tc.function?.name || 'unknown',
              arguments: args
            }
          } as ToolCall;
        });
      }

      const tokenUsage = {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      };

      return {
        message,
        tokenUsage,
        done: data.done || false
      };

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Ollama API timeout after ${timeoutMs}ms`);
      }
      if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to Ollama at ${this.baseUrl}`);
      }
      throw err;
    }
  }

  // Ollama specific methods
  async listModels(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
    const data = await response.json() as any;
    return data.models || [];
  }

  async ps(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ps`);
    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
    return await response.json();
  }

  async unload(model: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: "", keep_alive: 0 })
    });
    return response.ok;
  }
}
