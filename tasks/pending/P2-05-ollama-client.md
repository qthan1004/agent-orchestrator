# Task P2-05: OllamaClient Wrapper

## Info
- **ID:** P2-05-ollama-client
- **Module:** `src/worker/ollama-client.ts` (NEW)
- **Group:** Sprint 1 (Ollama + Process Management)
- **Dependencies:** none
- **Priority:** 6
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 5

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `OllamaClient` class — wrapper cho Ollama REST API.

### Methods:

1. **`health()`** → `boolean` — GET `/api/tags`, returns true if Ollama alive
2. **`chat(model, messages, tools?, options?)`** → `OllamaChatResponse` — POST `/api/chat`
   - Parse `tool_calls` from response
   - Handle streaming: `stream: false` (simplest first)
3. **`listModels()`** → `string[]` — GET `/api/tags`
4. **`ps()`** → loaded models + VRAM usage — GET `/api/ps`
5. **`unload(model)`** → POST `/api/generate { model, prompt:"", keep_alive: 0 }`

### Error handling:
- Connection refused → throw with clear message
- Timeout (30s default, configurable) → throw
- Malformed response → throw with raw body for debugging

### Types:
```typescript
interface OllamaChatMessage { role: 'system'|'user'|'assistant'|'tool'; content: string; tool_calls?: OllamaToolCall[]; }
interface OllamaToolCall { function: { name: string; arguments: Record<string, unknown> } }
interface OllamaChatResponse { message: OllamaChatMessage; prompt_eval_count: number; eval_count: number; done: boolean; }
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/ollama-client.ts` |
| NEW | `src/worker/index.ts` (barrel) |

## Verification
```bash
npm run build
# Unit test: mock Ollama API → client parse đúng response + tool_calls
```

## Done Criteria
- [ ] `client.health()` → true/false
- [ ] `client.chat()` trả response với tool_calls parsed
- [ ] `client.unload(model)` gọi keep_alive: 0
- [ ] Error handling cho connection refused, timeout, bad JSON
- [ ] Types exported
