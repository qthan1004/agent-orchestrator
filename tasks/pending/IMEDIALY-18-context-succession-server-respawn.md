# Task IMEDIALY-18: Context Succession Server Respawn

## Info
- **ID:** IMEDIALY-18-context-succession-server-respawn
- **Module:** harness context monitor, handover, server respawn
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-17
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 18
- **Plan-Next:** IMEDIALY-19-warm-model-cache-policy.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Near-context exhaustion is not a crash.
- Default mode is `server_respawn`.
- `handover_required` is not `failed`.
- Handover must be validated by runtime lease identity.

## What to do

Implement planned context succession:

- harness detects near context threshold
- harness pauses normal work
- model writes succession note
- harness validates required fields
- harness sends `handover_required` callback
- server stores handover by current lease
- server closes current lease as successor-ready
- scheduler starts next `lease_generation` with handover payload

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/harness/model-loop.ts` |
| MODIFY | `src/harness/runner.ts` |
| MODIFY | `src/harness/callback-client.ts` |
| MODIFY | `src/runtime/*` |
| MODIFY | `src/task/*` |
| MODIFY | `src/worker/dispatch-loop.ts` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Harness emits `handover_required` before context exhaustion
- [ ] Succession note has goal, progress, touched files, next action, risks, checks run
- [ ] Server stores handover only after lease validation
- [ ] Successor harness receives only matching handover payload
- [ ] Old lease cannot mutate task after successor starts
- [ ] `handover_required` is tracked separately from failed
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-19-warm-model-cache-policy.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
