# Task IMEDIALY-17: Strict Callback And Recovery Predicate

## Info
- **ID:** IMEDIALY-17-strict-callback-and-recovery-predicate
- **Module:** callback validation, recovery, lease validator
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-16
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 17
- **Plan-Next:** IMEDIALY-18-context-succession-server-respawn.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Stale time is not proof of death.
- Process exit is not proof of success.
- Callback without lease proof must not mutate task.
- Recovery must not reclaim live runtime.

## What to do

Make callback and recovery obey exact predicates:

- terminal callback accepted only once
- callback requires `task_id`, `worker_id`, `runtime_id`, `lease_generation`
- recovery requires expired heartbeat, prior health probe, dead service, same lease ownership, no accepted terminal callback
- late completion/handover cannot release another lease points

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/harness/callback-client.ts` |
| MODIFY | `src/mcp-server/index.ts` or callback route owner |
| MODIFY | `src/runtime/lease-validator.ts` |
| MODIFY | `src/runtime/heartbeat-store.ts` |
| MODIFY | `src/mcp-server/recovery.ts` |
| MODIFY | `src/worker/dispatch-loop.ts` only for callback acknowledgement wiring |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Late callback from old lease generation is rejected
- [x] Duplicate terminal callback is rejected
- [x] Recovery reads heartbeat and service liveness before task mutation
- [x] Reclaim requires same active `runtime_id + lease_generation`
- [x] Accepted callback releases only its own points
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-18-context-succession-server-respawn.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.

