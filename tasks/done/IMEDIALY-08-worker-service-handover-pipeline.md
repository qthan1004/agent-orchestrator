# Task IMEDIALY-08: Worker Service Handover Pipeline

## Info
- **ID:** IMEDIALY-08-worker-service-handover-pipeline
- **Module:** worker service handover, runtime service pipeline, checkpoint routing
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-07
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 08
- **Plan-Next:** IMEDIALY-09-mindset-docs-and-task-board-alignment.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Treat each worker/runtime as a service instance.
- Handover is per runtime/worker service, not a shared global note.
- Handover must preserve lease/task identity.
- Do not use handover to bypass scheduler, point allocator, or lease validation.
- No UI.

## What to do

Create a handover pipeline for service-like workers:

- define per-worker service handover contract
- handover source is current runtime lease/session
- handover target is the next runtime lease chosen by scheduler
- server stores/routes handover as task transition state
- worker service receives only its assigned handover payload
- handover records include `task_id`, `worker_id`, `runtime_id`, `lease_generation`, attempt/order, summary, open questions, modified files, next action
- stale or late handover must not mutate another runtime lease

This is not shared memory. It is a controlled pipeline from one service instance to the next.

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime/*` |
| NEW/MODIFY | `src/task/*` |
| NEW/MODIFY | `src/harness/*` |
| NEW/MODIFY | `src/scheduler/*` |
| MODIFY | `src/mcp-server/*` only for handover routing/state transition |
| MODIFY | `src/models/assignment.ts` only for payload contract |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Handover contract is scoped to one task + one runtime lease lineage
- [x] Each worker service receives only its assigned handover payload
- [x] Handover is routed by server/scheduler, not read from shared global memory
- [x] Late handover from old lease generation is rejected
- [x] Handover survives runtime death and supports retry/respawn
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-09-mindset-docs-and-task-board-alignment.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
