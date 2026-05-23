# Task IMEDIALY-11: Runtime Service Contracts And Events

## Info
- **ID:** IMEDIALY-11-runtime-service-contracts-and-events
- **Module:** runtime models, harness payload, visibility models
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-10
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 11
- **Plan-Next:** IMEDIALY-12-non-silent-harness-terminal-stream.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Contracts first, behavior second.
- Do not duplicate existing runtime identity shapes.
- Use existing `RuntimeIdentity` where possible.
- No backend-specific logic in shared contracts.

## What to do

Add or extend canonical contracts for:

- runtime service handle
- backend session identity
- harness ready event
- harness progress/lifecycle event
- context succession event
- warm model cache key/policy shape
- terminal callback state `handover_required`

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/runtime/models.ts` |
| MODIFY | `src/runtime/constants.ts` |
| MODIFY | `src/harness/payload.ts` |
| MODIFY | `src/harness/constants.ts` |
| MODIFY | `src/visibility/models.ts` |
| MODIFY | `src/visibility/constants.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Contracts express `Worker = Harness instance`
- [x] Runtime service exists only under active runtime lease
- [x] Ready event is a workflow result, not a boolean
- [x] Context succession and warm cache have explicit types
- [x] No duplicated identity interface added
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-12-non-silent-harness-terminal-stream.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.

