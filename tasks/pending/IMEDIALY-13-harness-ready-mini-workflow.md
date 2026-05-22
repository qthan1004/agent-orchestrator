# Task IMEDIALY-13: Harness Ready Mini Workflow

## Info
- **ID:** IMEDIALY-13-harness-ready-mini-workflow
- **Module:** harness ready protocol, runtime lease transition
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-12
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 13
- **Plan-Next:** IMEDIALY-14-runtime-service-adapter-boundary.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- `process spawned` is not `ready`.
- Server must not mark lease running until ready workflow passes.
- Ready failure must release lease and points.
- Do not start broad backend routing in this task.

## What to do

Implement the ready workflow:

- payload parsed
- runtime identity verified
- task source reachable
- backend adapter initialized
- model/session reachable
- heartbeat registered
- ready callback/event accepted by server

Failure path:

- emit failed step and reason
- kill harness/service
- release points
- close heartbeat
- requeue task with reason

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/harness/runner.ts` |
| MODIFY | `src/harness/callback-client.ts` |
| MODIFY | `src/runtime/runtime-manager.ts` |
| MODIFY | `src/runtime/heartbeat-store.ts` |
| MODIFY | `src/mcp-server/index.ts` or callback route owner |
| MODIFY | `src/worker/dispatch-loop.ts` only for state transition wiring |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Ready is represented as ordered checks
- [ ] Lease can reach `ready` only after checks pass
- [ ] Lease can reach `running` only after ready accepted
- [ ] Ready failure requeues task without accepting completion
- [ ] Terminal stream shows ready step progress
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-14-runtime-service-adapter-boundary.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
