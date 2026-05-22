# Task IMEDIALY-05: Refactor Infra Capacity And Resource Visibility

## Info
- **ID:** IMEDIALY-05-refactor-infra-capacity-and-resource-visibility
- **Module:** infra verifier, capacity profile, terminal resource table
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-04
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 05
- **Plan-Next:** IMEDIALY-06-refactor-local-ollama-isolation.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- No UI.
- Terminal table only.
- Infra measures; visibility renders.
- Scheduler consumes verified capacity, not hardware assumptions.

## What to do

Implement or normalize:

- infra verifier capacity profile
- capacity store
- resource monitor snapshots
- terminal resource table renderer
- server wiring that only connects snapshot to terminal output

If spike files already exist, either align them to the approved structure or leave them untouched and document why.

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/infra/*` |
| NEW/MODIFY | `src/visibility/*` |
| MODIFY | `src/mcp-server/index.ts` only for wiring |
| MODIFY | `src/worker/model-selector.ts` only to consume verified capacity |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Local capacity is measured dynamically
- [ ] Model/runtime profiles are estimates only
- [ ] Terminal table shows queue, workers, backend health, loaded models, VRAM, RAM, and CPU load
- [ ] Server does not own rendering logic
- [ ] No UI added
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-06-refactor-local-ollama-isolation.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
