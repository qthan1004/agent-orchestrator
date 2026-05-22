# Task IMEDIALY-04: Refactor Callback Lease Identity

## Info
- **ID:** IMEDIALY-04-refactor-callback-lease-identity
- **Module:** assignment payload, harness callback, lease validation
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-03
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 04
- **Plan-Next:** IMEDIALY-05-refactor-infra-capacity-and-resource-visibility.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Late callbacks must be rejected.
- Task completion requires matching `task_id`, `worker_id`, `runtime_id`, and `lease_generation`.
- Process exit is not task success.
- Do not add backend adapters.

## What to do

Thread lease identity through the lifecycle:

- assignment payload
- harness payload parser
- harness callback client
- server completion endpoint
- lease validator
- recovery paths

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/models/assignment.ts` |
| MODIFY | `src/harness/payload.ts` |
| MODIFY | `src/harness/callback-client.ts` |
| MODIFY | `src/harness/runner.ts` |
| MODIFY | `src/mcp-server/index.ts` |
| MODIFY | `src/runtime/*` |
| MODIFY | `src/mcp-server/recovery.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Callback payload includes `runtime_id` and `lease_generation`
- [ ] Server accepts callback only for active matching lease
- [ ] Late callback after requeue is rejected
- [ ] Accepted callback is the terminal done signal
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-05-refactor-infra-capacity-and-resource-visibility.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
