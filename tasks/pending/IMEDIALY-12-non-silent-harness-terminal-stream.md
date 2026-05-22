# Task IMEDIALY-12: Non Silent Harness Terminal Stream

## Info
- **ID:** IMEDIALY-12-non-silent-harness-terminal-stream
- **Module:** harness visibility, process output, terminal lifecycle
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-11
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 12
- **Plan-Next:** IMEDIALY-13-harness-ready-mini-workflow.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Terminal-first only. No UI.
- Visibility must not mutate lifecycle state.
- Do not hide useful stdout/stderr until task end.
- CLI quiet sessions still need wrapper progress.

## What to do

Make harness execution visible like a normal CLI:

- stream harness stdout/stderr line-by-line with stable prefix
- stream backend/CLI stdout/stderr when available
- emit wrapper lifecycle lines for quiet backend sessions
- include `task_id`, `runtime_id`, `lease_generation`, backend, phase
- show context usage checkpoints when available
- avoid dumping secrets or full prompt bodies

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/process-manager.ts` |
| MODIFY | `src/runtime/runtime-manager.ts` only for event wiring |
| MODIFY | `src/harness/runner.ts` |
| MODIFY | `src/visibility/*` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] User can see a CLI-like stream while harness runs
- [ ] Harness phases are visible before model call, during model call, and during cleanup
- [ ] Quiet CLI backend gets periodic wrapper progress
- [ ] Output is prefixed by worker/runtime identity
- [ ] Visibility code does not mutate task/runtime state
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-13-harness-ready-mini-workflow.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
