# Task EV14: Error Diagnosis Persistence (Session Schema v2)

## Info
- **ID:** EV14-error-diagnosis-persistence
- **Module:** src/mcp-server/
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV09b
- **Priority:** 14
- **Ref:** `prompt_review.md` v3 — Section 4.3 (Devin self-heal), `phase2_cross_review.md` Gap B

## What to do

Enhance session checkpoint to persist error diagnosis, enabling intelligent retry.
Inspired by Devin 2026's self-healing loop (34% → 67% PR merge improvement).

### 1. Session schema v2
**[MODIFY] `src/mcp-server/tools/session-checkpoint.ts`**

Extend session data type:
```typescript
interface SessionDataV2 {
  version: 2;
  task_id: string;
  phase: 'pre-flight' | 'implementation' | 'verification' | 'done';
  files_changed: string[];
  done_criteria_status: Record<string, boolean>;
  last_action: string;
  error_context: {
    error: string;
    hypothesis: string;
    attempted_fix: string;
    retry_count: number;
  } | null;
  created_at: string;
  updated_at: string;
}
```

Add validation (Zod schema). Backward-compatible: v1 sessions still loadable.

### 2. Error context injection on retry
**[MODIFY] `src/mcp-server/state-manager.ts`**

When `requeueWithRetry()`:
- Read `.agent/session.json` if exists
- Attach `error_context` to task metadata
- Next worker receives previous error diagnosis

### 3. Update prompt
**[MODIFY] `prompts/agent-prompt.md`**

Add to retry-aware pre-flight (from EV09b):
```markdown
If task has error_context from previous attempt:
- Read previous error and hypothesis
- Avoid repeating the same fix
- Prioritize alternative approaches
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools/session-checkpoint.ts` |
| MODIFY | `src/mcp-server/state-manager.ts` |
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# 1. Build passes
npm run build

# 2. Session save with error_context works
# Simulate: agent saves session with error → requeue → new agent loads error context

# 3. Backward compat: load v1 session still works
```

## Done Criteria
- [x] SessionDataV2 interface with typed error_context
- [x] Zod schema validates session data
- [x] Backward compatible (v1 sessions still loadable)
- [x] requeueWithRetry preserves error_context
- [x] Prompt updated with error context usage instructions
- [x] Build passes with no type errors
