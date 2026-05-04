# Task P2-16: Server Startup Integration (HYBRID Mode)

## Info
- **ID:** P2-16-server-hybrid-integration
- **Module:** `src/mcp-server/index.ts`
- **Group:** Sprint 3 (Server Dispatch Integration)
- **Dependencies:** P2-08, P2-14, P2-15
- **Priority:** 12
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 6

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Wire all HYBRID components into server startup/shutdown.

### When profile = HYBRID:
1. Initialize: OllamaClient, ModelSelector, WorkerProcessManager, VramManager, TaskDispatchLoop
2. Start dispatch loop
3. Start VRAM monitoring
4. Health endpoint: add `ollama_status`, `vram`, `dispatch_loop`, `active_workers`

### Graceful shutdown (HYBRID):
1. Stop dispatch loop
2. Kill active workers
3. Unload all models from VRAM
4. Normal shutdown flow

### DEFAULT profile: identical to current behavior — no changes.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/index.ts` |

## Done Criteria
- [ ] HYBRID: dispatch loop starts, workers spawn
- [ ] `/health` shows ollama_status, vram, dispatch info
- [ ] Graceful shutdown stops loop + unloads models
- [ ] DEFAULT: unchanged behavior
