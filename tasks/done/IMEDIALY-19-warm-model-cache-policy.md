# Task IMEDIALY-19: Warm Model Cache Policy

## Info
- **ID:** IMEDIALY-19-warm-model-cache-policy
- **Module:** infra capacity, Ollama adapter, scheduler cache preference
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-18
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 19
- **Plan-Next:** IMEDIALY-20-cli-runtime-service-adapters.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Cache is not task ownership.
- Releasing a lease must not blindly unload warm model cache.
- Cache eviction belongs to infra/capacity policy.
- No hardcoded VRAM baseline.

## What to do

Separate execution lease cleanup from model cache eviction:

- define warm cache key and TTL
- expose loaded model/cache snapshot
- scheduler may prefer successor lease using same warm cache
- adapter cleanup respects cache policy
- eviction occurs by TTL, pressure, or explicit scheduler decision

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/infra/*` |
| MODIFY | `src/runtime/point-allocator.ts` |
| MODIFY | `src/runtime-adapters/ollama/*` |
| MODIFY | `src/scheduler/*` |
| MODIFY | `src/visibility/resource-terminal-table.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Warm cache state is separate from runtime lease state
- [x] Lease release does not always unload model
- [x] Cache can be evicted by TTL or resource pressure
- [x] Successor route can prefer warm model when safe
- [x] Terminal table shows warm cache/loaded model state
- [x] No fixed local VRAM number controls scheduling
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-20-cli-runtime-service-adapters.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.

