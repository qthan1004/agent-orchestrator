# Task P2-18: Unified Checkpoint Format

## Info
- **ID:** P2-18-unified-checkpoint
- **Module:** `src/models/checkpoint.ts` (NEW)
- **Group:** Sprint 4 (Polish + E2E)
- **Dependencies:** P2-13
- **Priority:** 13
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Addendum Update 4

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Create `UnifiedCheckpoint` interface shared by IDE agent and local LLM worker.

### Schema:
```typescript
interface UnifiedCheckpoint {
  task_id: string;
  phase: 'pre-flight' | 'implementation' | 'verification' | 'done';
  files_changed: string[];
  completed_steps: string[];
  remaining_steps: string[];
  error_context: { error: string; hypothesis: string; attempted_fix: string } | null;
  token_usage?: { used: number; limit: number };
}
```

### Integration:
- AgentRunner uses this format for checkpoints
- session_checkpoint tool uses same format
- Backward compat: old format still loadable

## Files
| Action | Path |
|--------|------|
| NEW | `src/models/checkpoint.ts` |
| MODIFY | `src/worker/agent-runner.ts` |
| MODIFY | `src/mcp-server/tools.ts` (session_checkpoint) |

## Done Criteria
- [x] `UnifiedCheckpoint` type shared between worker + server
- [x] AgentRunner writes unified format
- [x] session_checkpoint reads/writes same format
- [x] Old v1 format still loadable
