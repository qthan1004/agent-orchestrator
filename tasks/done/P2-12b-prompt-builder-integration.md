# Task P2-12b: PromptBuilder Integration into AgentRunner

## Info
- **ID:** P2-12b-prompt-builder-integration
- **Module:** `src/worker/agent-runner.ts` (MODIFY)
- **Group:** Sprint 2 (Agent Runner Core) — Hotfix
- **Dependencies:** P2-12, P2-13
- **Priority:** 10 (high — blocks all worker prompt quality)
- **Reason:** P2-12 created `PromptBuilder` + prompt templates but no task wired it into the actual execution flow. Agent-runner currently uses a hardcoded placeholder string.

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Wire `PromptBuilder` into `AgentRunner` so worker agents receive dynamic, action-aware system prompts instead of the current hardcoded string.

### Changes in `src/worker/agent-runner.ts`:

1. **Import** `PromptBuilder` and `PromptTask` from `./prompt-builder.js`
2. **Instantiate** `PromptBuilder` (default promptsDir)
3. **Build prompt** using `promptBuilder.buildPrompt()` with task info from payload
4. **Replace** the hardcoded system message (line ~62):
   ```typescript
   // BEFORE (hardcoded placeholder):
   { role: ChatRole.SYSTEM, content: "You are an AI assistant. You must complete the given task." }

   // AFTER (dynamic prompt from PromptBuilder):
   { role: ChatRole.SYSTEM, content: await promptBuilder.buildPrompt(promptTask) }
   ```

### Payload → PromptTask mapping:
- `task_id` → `payload.task_id`
- `action` → extract from payload (add `action` field to `WorkerPayload` if missing, default `'implement'`)
- `module` → extract from payload (add `module` field to `WorkerPayload` if missing, default `''`)
- `workspaceRoot` → `payload.workspace_root`

### WorkerPayload update:
Add optional fields if not present:
```typescript
interface WorkerPayload {
  // ... existing fields
  action?: string;   // e.g. 'implement', 'test', 'refactor'
  module?: string;   // e.g. 'src/worker/agent-runner.ts'
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/agent-runner.ts` |

## Done Criteria
- [x] `PromptBuilder` imported and instantiated in agent-runner
- [x] System prompt built dynamically via `buildPrompt()`
- [x] Hardcoded placeholder string removed
- [x] `WorkerPayload` extended with `action` and `module` fields
- [x] Fallback works: missing action defaults to `'implement'`, missing module defaults to `''`
