# Task IMEDIALY-21: Runtime Service E2E And Doc Alignment

## Info
- **ID:** IMEDIALY-21-runtime-service-e2e-and-doc-alignment
- **Module:** tests, dev docs, task board
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-20
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 21
- **Plan-Next:** STOP
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Test behavior, not internal implementation names.
- No product docs in `plan/`, `exchange/`, `reference/`, or `prompts/`.
- Do not remove MCP tools in this task.
- No UI.

## What to do

Verify the architecture end to end and align docs:

- ready workflow test
- callback stale rejection test
- recovery predicate test
- non-silent terminal stream smoke
- context succession server respawn test
- warm cache policy test or scripted verification
- backend routing smoke for local and CLI-capable paths
- update active docs/task board to reflect actual implementation

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `tests/*` |
| MODIFY | `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md` only if implementation differs |
| MODIFY | `dev-docs/2026-05-22_plan_runtime-lease-refactor.md` |
| MODIFY | `tasks/README.md` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Tests or smoke scripts cover ready workflow
- [ ] Tests or smoke scripts cover stale callback rejection
- [ ] Tests or smoke scripts cover context succession
- [ ] Tests or smoke scripts cover warm cache lease separation
- [ ] Terminal output proves harness is not silent
- [ ] Docs match implemented behavior
- [ ] Task board marks this plan completed and stops
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

This task ends `Plan-ID: IMEDIALY-worker-harness-service-correction`.

After this task is completed and moved to `tasks/done/`, stop. Do not call `/pick-task` for tasks outside this plan.
