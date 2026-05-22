# Task IMEDIALY-03: Refactor Scheduler Runtime Split

## Info
- **ID:** IMEDIALY-03-refactor-scheduler-runtime-split
- **Module:** scheduler, runtime manager, dispatch loop
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-02
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 03
- **Plan-Next:** IMEDIALY-04-refactor-callback-lease-identity.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Dispatch loop decides policy only.
- Runtime manager owns spawn/kill/health.
- Recovery probes runtime manager, not worker process details.
- Keep backend adapter internals out of server modules.

## What to do

Split mixed responsibilities:

- move spawn/kill/health from dispatch loop/process manager into runtime manager boundary
- keep scheduling decisions in scheduler/dispatch
- keep task state transitions in task/state owner
- keep recovery mutation behind explicit runtime liveness checks

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime/runtime-manager.ts` |
| NEW/MODIFY | `src/scheduler/*` |
| MODIFY | `src/worker/dispatch-loop.ts` |
| MODIFY | `src/worker/process-manager.ts` |
| MODIFY | `src/mcp-server/recovery.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Dispatch loop no longer owns process health details
- [ ] Runtime manager exposes `spawn`, `kill`, and `isAlive`
- [ ] Recovery checks runtime manager before reclaim
- [ ] Server modules do not import backend adapters for scheduling decisions
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-04-refactor-callback-lease-identity.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
