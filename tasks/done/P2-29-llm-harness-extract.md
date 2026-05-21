# Task P2-29: Extract LLM Harness from Agent Runner

## Info
- **ID:** P2-29-llm-harness-extract
- **Module:** `src/worker/llm-harness.ts` (NEW)
- **Group:** Core — LLM Harness
- **Dependencies:** P2-11, P2-20
- **Priority:** 14
- **Ref:** `dev-docs/2026-05-21_design_llm-harness-wrapper.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Design Context

The Server must never interact with the LLM directly. Three-layer architecture:

```
Server (Body)  ↔  Harness (wrapper)  ↔  Model (LLM)
```

The Harness owns:
- Context window monitoring (token counting per response)
- Model lifecycle (load → use → unload per task)
- LLM chat loop (currently flat code in agent-runner.ts)
- Future: context handover flow, difficulty routing

## What to do

Extract the LLM chat loop from `agent-runner.ts` into a standalone `LLMHarness` class.

### 1. Create `src/worker/llm-harness.ts`

```typescript
interface HarnessConfig {
  adapter: LLMAdapter;
  model: string;
  contextLimit: number;       // max tokens for this model
  contextThreshold: number;   // 0.85 = 85% → trigger handover (P2-30)
  tools: ToolDefinition[];
  toolExecutor: ToolExecutor;
}

interface HarnessResult {
  status: 'complete' | 'context_exceeded' | 'error' | 'max_iterations';
  summary: string;
  tokenUsage: { used: number; limit: number; percent: number };
  handover?: string;          // handover content (P2-30 will populate)
  changelog?: any;
  errorContext?: any;
}

class LLMHarness {
  constructor(config: HarnessConfig);

  /** Run the tool-calling loop until complete or threshold hit */
  async run(messages: ChatMessage[]): Promise<HarnessResult>;

  /** Get current context usage */
  getContextUsage(): { used: number; limit: number; percent: number };
}
```

### 2. Extract from agent-runner.ts

Move these responsibilities INTO `LLMHarness`:
- The `while (loopCount < MAX_TOOL_CALLS)` loop (lines 144-292)
- Token counting via `TokenCounter` (line 153)
- Tool call execution (lines 174-234)
- Reflexion error handling (lines 236-249)
- Context checkpoint detection (lines 251-291)
- Consecutive no-tools / malformed JSON guards

### 3. Simplify agent-runner.ts

After extraction, `agent-runner.ts` becomes a thin entry point:

```typescript
async function main() {
  // 1. Parse stdin payload (unchanged)
  // 2. Build system prompt (unchanged)
  // 3. Create Harness
  const harness = new LLMHarness({
    adapter: createAdapter({ adapter: 'ollama' }),
    model,
    contextLimit: 16384,
    contextThreshold: 0.85,
    tools,
    toolExecutor
  });

  // 4. Run harness
  const result = await harness.run(messages);

  // 5. Notify server based on result.status
  if (result.status === 'complete') {
    await notifyComplete(server_url, worker_id, task_id, result.summary, true, undefined, result.changelog);
  } else {
    await notifyComplete(server_url, worker_id, task_id, result.summary, false, result.errorContext);
  }
}
```

### 4. Do NOT implement yet

The following belong to subsequent tasks:
- Context handover flow (P2-30)
- Difficulty routing (P2-31)
- Server-side respawn logic (P2-32)

This task only extracts and wraps. The `contextThreshold` config is accepted but not acted on.

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/llm-harness.ts` |
| MODIFY | `src/worker/agent-runner.ts` (simplify to use Harness) |

## Done Criteria
- [x] `LLMHarness` class created with `run()` method
- [x] Chat loop extracted from agent-runner into Harness
- [x] Token counting lives inside Harness
- [x] Tool execution delegated through Harness
- [x] agent-runner.ts is thin wrapper: parse → build prompt → harness.run() → notify
- [x] `HarnessResult` includes status, tokenUsage, summary
- [x] Context threshold config accepted but NOT acted on yet (placeholder for P2-30)
- [x] All existing behavior preserved (reflexion, guards, complete_task)
- [x] `npm run build` passes
