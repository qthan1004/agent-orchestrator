# Task P2-06: WorkerProcessManager

## Info
- **ID:** P2-06-worker-process-manager
- **Module:** `src/worker/process-manager.ts` (NEW)
- **Group:** Sprint 1 (Ollama + Process Management)
- **Dependencies:** none
- **Priority:** 6
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.1, 7

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `WorkerProcessManager` class — spawn/kill worker subprocesses via `child_process.spawn`.

### Core API:

1. **`spawn(payload)`** → `{ pid, worker_id }`
   - `child_process.spawn('node', ['src/worker/agent-runner.js'])`
   - Write `payload` JSON to stdin
   - Track: `pid → { worker_id, task_id, started_at }`
   
2. **`kill(pid)`** → graceful shutdown
   - Stage 1: `SIGTERM` → wait 3s
   - Stage 2: `SIGKILL` if still alive
   - Stage 3: `kill -9 <pid>` (nuclear)

3. **`getActive()`** → list active worker processes

4. **Events** (EventEmitter):
   - `worker:exit` → `{ pid, worker_id, task_id, code, signal }`
   - `worker:timeout` → `{ pid, worker_id, task_id }`

5. **Timeout**: configurable per-task (default 5 min)
   - Timer starts on spawn
   - On timeout → kill(pid) + emit `worker:timeout`

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/process-manager.ts` |

## Verification
```bash
npm run build
# Test: spawn echo script → receives stdin → exits
# Test timeout: spawn sleeping script → killed after configured timeout
```

## Done Criteria
- [ ] `spawn(payload)` → child process alive, receives stdin data
- [ ] `kill(pid)` → graceful (SIGTERM) then force (SIGKILL)
- [ ] Timeout auto-kill works
- [ ] `worker:exit` event fires with correct data
- [ ] `worker:timeout` event fires on timeout
- [ ] `getActive()` returns current workers
