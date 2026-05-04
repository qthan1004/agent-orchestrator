# Task P2-15: VRAM Lifecycle Manager

## Info
- **ID:** P2-15-vram-manager
- **Module:** `src/worker/vram-manager.ts` (NEW)
- **Group:** Sprint 3 (Server Dispatch Integration)
- **Dependencies:** P2-05, P2-07
- **Priority:** 11
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 5

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `VramManager` — VRAM lifecycle management.

### API:
- `unloadAfterUse(model)` → call `ollama.unload(model)` after worker exits
- `checkVram()` → `{ used_mb, total_mb, percentage }` via `nvidia-smi`
- `canSpawn(profile)` → `boolean` — check if enough VRAM for model
- `startMonitoring(intervalMs)` → periodic VRAM + Ollama health check
- `stopMonitoring()`

### Monitoring (every 30s):
- Ollama alive? `GET /api/tags`
- Models loaded? `ollama ps`
- VRAM usage? `nvidia-smi --query-gpu=memory.used,memory.total`
- Alert if VRAM > 90%

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/vram-manager.ts` |

## Done Criteria
- [ ] `unloadAfterUse(model)` frees VRAM
- [ ] `checkVram()` returns usage data
- [ ] Warning at > 90% utilization
- [ ] `canSpawn(profile)` guards against OOM
