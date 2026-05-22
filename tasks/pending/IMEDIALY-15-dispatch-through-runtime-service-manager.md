# Task IMEDIALY-15: Dispatch Through Runtime Service Manager

## Info
- **ID:** IMEDIALY-15-dispatch-through-runtime-service-manager
- **Module:** dispatch loop, runtime service manager
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-14
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 15
- **Plan-Next:** IMEDIALY-16-backend-routing-and-harness-payload.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Dispatch loop only loops and delegates.
- Scheduler decides. Runtime starts. Adapter spawns.
- Do not move task state into runtime service manager.
- Preserve current successful Ollama behavior.

## What to do

Make dispatch use the runtime service boundary:

- dispatch locks task and asks scheduler/runtime for lease start
- runtime service manager starts selected service
- active harness tracking uses runtime identity, not only worker id
- monitor path closes service through runtime manager
- process exit alone is not completion

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/dispatch-loop.ts` |
| MODIFY | `src/runtime/runtime-manager.ts` |
| MODIFY | `src/runtime/runtime-service-manager.ts` |
| MODIFY | `src/runtime/lease-validator.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Dispatch loop does not directly own process/backend details
- [ ] Active runtime tracking uses `runtime_id + lease_generation`
- [ ] Runtime service cleanup is called through runtime owner
- [ ] Process exit without accepted terminal callback requeues/fails safely
- [ ] Existing single Ollama dispatch still works
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-16-backend-routing-and-harness-payload.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
