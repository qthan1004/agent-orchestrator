# Task IMEDIALY-06: Refactor Local Ollama Isolation

## Info
- **ID:** IMEDIALY-06-refactor-local-ollama-isolation
- **Module:** local runtime adapter, Ollama runtime lease
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-05
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 06
- **Plan-Next:** IMEDIALY-07-refactor-cli-runtime-adapters.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Shared Ollama is dev-only fallback.
- Production local parallelism requires isolated runtime endpoint per lease.
- Capacity allocator must approve local runtime count/model/context.
- Do not add CLI adapters in this task.

## What to do

Implement local Ollama runtime lease isolation:

- one private Ollama endpoint per runtime lease where supported
- payload carries `ollama_base_url`
- harness uses payload endpoint
- terminal runtime state kills only its own backend runtime/session
- shared fallback limited to `maxConcurrentWorkers = 1`

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime-adapters/ollama/*` |
| MODIFY | `src/runtime/*` |
| MODIFY | `src/harness/payload.ts` |
| MODIFY | `src/worker/adapters/ollama-adapter.ts` |
| MODIFY | `src/utils/ollama-launcher.ts` only if needed |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Two local leases can use different endpoints
- [x] Worker A cannot complete worker B task
- [x] Killing lease A does not unload/kill lease B
- [x] Shared fallback is explicitly marked dev-only and single-worker
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-07-refactor-cli-runtime-adapters.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
