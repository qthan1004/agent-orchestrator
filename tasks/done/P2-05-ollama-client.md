# Task P2-05: LLM Adapter Interface + OllamaAdapter

> ⚡ **Revised 2026-05-07**: Renamed from "OllamaClient". Now defines a language-agnostic `LLMAdapter` interface + OllamaAdapter as first implementation. Cloud adapters (Gemini, etc.) will implement the same interface in P2-05b.

## Info
- **ID:** P2-05-llm-adapter
- **Module:** `src/worker/adapters/llm-adapter.ts` (NEW), `src/worker/adapters/ollama-adapter.ts` (NEW)
- **Group:** Sprint 1 (LLM Adapter + Process Management)
- **Dependencies:** none
- **Priority:** 6
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 5, `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

### 1. LLMAdapter Interface (abstract, language-agnostic)

```typescript
interface LLMAdapter {
  /** Check if the LLM backend is available */
  health(): Promise<boolean>;
  
  /** Send chat messages with optional tool definitions, get response */
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  /** Get adapter name for logging */
  readonly name: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  options?: Record<string, unknown>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: Record<string, unknown> };
}

interface ChatResponse {
  message: ChatMessage;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  done: boolean;
}
```

### 2. OllamaAdapter (first implementation)

Methods:
1. **`health()`** → GET `/api/tags`, returns true if Ollama alive
2. **`chat(request)`** → POST `/api/chat`
   - Map `ChatRequest` → Ollama format
   - Parse `tool_calls` from Ollama response → unified `ToolCall` format
   - Map `prompt_eval_count` + `eval_count` → `tokenUsage`
   - `stream: false` (simplest first)
3. **Ollama-specific methods** (not on interface):
   - `listModels()` → GET `/api/tags`
   - `ps()` → loaded models + VRAM usage — GET `/api/ps`
   - `unload(model)` → POST `/api/generate { model, prompt:"", keep_alive: 0 }`

### 3. Adapter Factory

```typescript
function createAdapter(config: { adapter: 'ollama' | 'gemini'; baseUrl?: string }): LLMAdapter
```

### Error handling:
- Connection refused → throw with clear message
- Timeout (30s default, configurable) → throw
- Malformed response → throw with raw body for debugging

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/adapters/llm-adapter.ts` (interface + types) |
| NEW | `src/worker/adapters/ollama-adapter.ts` (Ollama implementation) |
| NEW | `src/worker/adapters/index.ts` (barrel + factory) |

## Done Criteria
- [x] `LLMAdapter` interface defined with `health()` and `chat()`
- [x] Unified types: `ChatRequest`, `ChatResponse`, `ChatMessage`, `ToolCall`
- [x] `OllamaAdapter` implements `LLMAdapter`
- [x] `createAdapter('ollama')` returns OllamaAdapter instance
- [x] `createAdapter('gemini')` throws "not implemented" (placeholder for P2-05b)
- [x] Error handling for connection refused, timeout, bad JSON
- [x] `npm run build` pass
