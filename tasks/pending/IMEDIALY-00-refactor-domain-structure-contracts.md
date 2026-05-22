# Task IMEDIALY-00: Refactor Domain Structure Contracts

## Info
- **ID:** IMEDIALY-00-refactor-domain-structure-contracts
- **Module:** runtime, task, scheduler, infra, visibility, harness boundaries
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** NONE
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 00
- **Plan-Next:** IMEDIALY-01-refactor-constants-and-text-boundaries.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Read `.agent/skills/module-boundary-discipline/SKILL.md` before editing.
- Structure first. Do not change runtime behavior unless imports require it.
- No adapter expansion.
- No UI.
- Do not delete accidental spike files without explicit user permission.

## What to do

Create the domain structure needed for the runtime lease refactor:

- `src/runtime/`
- `src/task/`
- `src/scheduler/`
- `src/infra/`
- `src/visibility/`

Move or introduce only contracts and public exports needed to make ownership clear:

- runtime identity, lease, backend, isolation, heartbeat contracts
- task state contracts
- scheduler decision contracts
- infra capacity/resource snapshot contracts
- visibility event/table contracts

Keep behavior stable.

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime/*` |
| NEW/MODIFY | `src/task/*` |
| NEW/MODIFY | `src/scheduler/*` |
| NEW/MODIFY | `src/infra/*` |
| NEW/MODIFY | `src/visibility/*` |
| MODIFY | imports that must point to new domain contracts |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Domain folders exist with `index.ts`, `models.ts`, and `constants.ts` where needed
- [ ] Runtime, task, scheduler, infra, and visibility contracts are not duplicated
- [ ] `Worker` is not used as a catch-all type for runtime/task/process/backend
- [ ] No behavior change beyond import/contract normalization
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-01-refactor-constants-and-text-boundaries.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
