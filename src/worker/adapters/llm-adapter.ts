export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: Record<string, unknown> | string };
}

export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string; // Optional name for tool role
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  options?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  message: ChatMessage;
  tokenUsage: TokenUsage;
  done: boolean;
}

export interface LLMAdapter {
  /** Check if the LLM backend is available */
  health(): Promise<boolean>;
  
  /** Send chat messages with optional tool definitions, get response */
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  /** Get adapter name for logging */
  readonly name: string;
}
