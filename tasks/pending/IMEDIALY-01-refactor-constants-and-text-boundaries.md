# Task IMEDIALY-01: Refactor Constants And Text Boundaries

## Info
- **ID:** IMEDIALY-01-refactor-constants-and-text-boundaries
- **Module:** constants, messages, timing defaults
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-00
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 01
- **Plan-Next:** IMEDIALY-02-refactor-runtime-lease-stores.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- No behavior changes.
- No new abstractions except constants/message modules.
- Do not move unrelated constants.
- Keep domain text in domain `constants.ts`.

## What to do

Move immutable values and text out of mixed logic:

- harness loop summaries/prompts/log labels
- runner callback/status messages
- dispatch/recovery/process lifecycle messages
- lifecycle timing defaults
- infra/visibility labels

Each domain should read constants, not invent them inside class/function bodies.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/harness/*` |
| MODIFY | `src/worker/*` |
| MODIFY | `src/mcp-server/*` |
| MODIFY | `src/runtime/constants.ts` |
| MODIFY | `src/infra/constants.ts` |
| MODIFY | `src/visibility/constants.ts` |
| MODIFY | `src/constants.ts` only for truly shared constants |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] No repeated lifecycle/log/error text in touched logic
- [ ] No class-local magic numbers for lifecycle timing
- [ ] Timing defaults have one owner
- [ ] Domain text lives in domain constants
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-02-refactor-runtime-lease-stores.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
