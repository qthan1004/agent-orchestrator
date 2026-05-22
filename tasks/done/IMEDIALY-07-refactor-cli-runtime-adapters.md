# Task IMEDIALY-07: Refactor CLI Runtime Adapters

## Info
- **ID:** IMEDIALY-07-refactor-cli-runtime-adapters
- **Module:** Codex CLI runtime, AG CLI runtime, backend adapter boundary
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-06
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 07
- **Plan-Next:** IMEDIALY-08-worker-service-handover-pipeline.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Each CLI runtime lease owns one process/session.
- Server must not know CLI internals.
- Route high-point tasks by scheduler/allocator only.
- Local and CLI runtimes must be able to coexist.

## What to do

Add adapter boundaries for:

- `runtime-adapters/codex-cli`
- `runtime-adapters/ag-cli`

Wire only through runtime manager and scheduler contracts.

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime-adapters/codex-cli/*` |
| NEW/MODIFY | `src/runtime-adapters/ag-cli/*` |
| MODIFY | `src/runtime/*` |
| MODIFY | `src/scheduler/*` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Codex CLI adapter owns Codex process/session lifecycle
- [x] AG CLI adapter owns AG process/session lifecycle
- [x] High-point task can route to CLI pool by contract
- [x] Local and CLI runtime leases can coexist
- [x] Server modules do not import CLI adapter internals
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-08-worker-service-handover-pipeline.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
