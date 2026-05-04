# Task P2-14: TaskDispatchLoop

## Info
- **ID:** P2-14-task-dispatch-loop
- **Module:** `src/worker/dispatch-loop.ts` (NEW)
- **Group:** Sprint 3 (Server Dispatch Integration)
- **Dependencies:** P2-03, P2-06, P2-07
- **Priority:** 11
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.7

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `TaskDispatchLoop` — main server loop for HYBRID mode.

### Loop logic:
```
while (running):
  1. queue.getNextTask() → has task? continue : sleep 2s, retry
  2. stateManager.moveToActive(task.id)
  3. modelSelector.selectProfile(task, queueStatus)
  4. processManager.spawn({ worker_id, task_id, task_details, model, workspace_root, server_url, allowed_tools })
  5. Wait for worker exit OR timeout
     → exit(0) + complete_task received → done
     → crash/timeout → requeue task
  6. ollamaClient.unload(model)
  7. → loop
```

### API:
- `start()` — begin loop
- `stop()` — graceful stop (finish current task, then exit)
- Only runs in HYBRID profile

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/dispatch-loop.ts` |

## Done Criteria
- [ ] Loop picks task → spawns worker → waits → loops
- [ ] Worker exit(0) → task outbox
- [ ] Worker crash → task requeued to inbox
- [ ] Worker timeout → killed + requeued
- [ ] Queue empty → sleep 2s, retry
- [ ] `stop()` gracefully exits loop
