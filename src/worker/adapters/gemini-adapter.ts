import { ChatRole } from './llm-adapter.js';
import type { LLMAdapter, ChatRequest, ChatResponse, ChatMessage, ToolCall } from './llm-adapter.js';

export class GeminiAdapter implements LLMAdapter {
  private baseUrl: string;
  private apiKey: string;
  readonly name = 'gemini';

  constructor(apiKey?: string, baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async health(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      // Try to fetch models list to check health
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
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

    let systemInstruction: any = undefined;
    const contents: any[] = [];

    // Map messages
    for (const msg of request.messages) {
      if (msg.role === ChatRole.SYSTEM) {
        systemInstruction = {
          parts: [{ text: msg.content }]
        };
      } else if (msg.role === ChatRole.USER) {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === ChatRole.ASSISTANT) {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: tc.function.arguments
              }
            });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === ChatRole.TOOL) {
        let responseObj: any = { result: msg.content };
        try {
          // If the tool content is valid JSON, parse it so Gemini sees structured data
          responseObj = JSON.parse(msg.content);
        } catch (_) {
          // Keep as text in an object wrapper
        }
        
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.name || 'unknown_tool',
              response: typeof responseObj === 'object' ? responseObj : { result: responseObj }
            }
          }]
        });
      }
    }

    const payload: any = { contents };
    
    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    if (request.tools && request.tools.length > 0) {
      const functionDeclarations = request.tools.map(t => {
        return {
          name: t.function.name,
          description: t.function.description || '',
          parameters: t.function.parameters
        };
      });
      payload.tools = [{ functionDeclarations }];
    }

    // Handle options/config
    if (request.options) {
      payload.generationConfig = {};
      if (request.options.temperature !== undefined) payload.generationConfig.temperature = request.options.temperature;
      if (request.options.top_p !== undefined) payload.generationConfig.topP = request.options.top_p;
      if (request.options.top_k !== undefined) payload.generationConfig.topK = request.options.top_k;
      if (request.options.max_tokens !== undefined) payload.generationConfig.maxOutputTokens = request.options.max_tokens;
    }

    try {
      const model = request.model || 'gemini-1.5-flash'; // fallback
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${text}`);
      }

      const data = await response.json() as any;
      
      // Parse response
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error(`Gemini API returned no candidates. Raw body: ${JSON.stringify(data)}`);
      }

      const message: ChatMessage = {
        role: ChatRole.ASSISTANT,
        content: '',
      };

      const parts = candidate.content?.parts || [];
      const toolCalls: ToolCall[] = [];

      for (const part of parts) {
        if (part.text) {
          message.content += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: part.functionCall.args || {}
            }
          });
        }
      }

      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }

      const usageMetadata = data.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      };

      return {
        message,
        tokenUsage,
        done: true
      };

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API timeout after ${timeoutMs}ms`);
      }
      if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to Gemini API at ${this.baseUrl}`);
      }
      throw err;
    }
  }
}
