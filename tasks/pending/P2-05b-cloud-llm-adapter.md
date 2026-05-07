# Task P2-05b: Cloud LLM Adapter (Gemini)

## Info
- **ID:** P2-05b-cloud-llm-adapter
- **Module:** `src/worker/adapters/gemini-adapter.ts` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** P2-05
- **Priority:** 10
- **Ref:** `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Implement `GeminiAdapter` cho `LLMAdapter` interface (defined in P2-05).

### Requirements:
1. Implement `LLMAdapter` interface: `chat(messages, tools) → response`
2. Call Gemini API via REST (`https://generativelanguage.googleapis.com/v1beta/`)
3. API key from env: `GEMINI_API_KEY`
4. Map tool_calls format: Gemini function_calling → unified tool_call format
5. Map response format: Gemini response → unified response format
6. Token tracking: extract `usageMetadata` from response

### Design notes:
- LLMAdapter interface phải language-agnostic (stdin/stdout contract)
- Adapter selection via config: `{ adapter: 'ollama' | 'gemini', model: 'gemini-2.5-flash' }`
- Nếu Gemini API unavailable → fail fast with clear error, không fallback

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/adapters/gemini-adapter.ts` |
| MODIFY | `src/worker/adapters/index.ts` (export) |

## Done Criteria
- [ ] Implements `LLMAdapter` interface
- [ ] Calls Gemini REST API with tool definitions
- [ ] Parses Gemini function_calling responses correctly
- [ ] Token usage tracking from `usageMetadata`
- [ ] API key from `GEMINI_API_KEY` env var
- [ ] `npm run build` pass
