# Task IMEDIALY-16: Backend Routing And Harness Payload

## Info
- **ID:** IMEDIALY-16-backend-routing-and-harness-payload
- **Module:** scheduler routing, harness payload, adapter selection
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-15
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 16
- **Plan-Next:** IMEDIALY-17-strict-callback-and-recovery-predicate.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- No hardcoded Ollama dispatch path.
- Scheduler consumes verified capacity.
- Harness reads backend from payload.
- Model/CLI never calls server.

## What to do

Replace Ollama-only assumptions with routing contract:

- scheduler returns backend/model/capacity estimate
- dispatch checks selected backend health, not global Ollama only
- payload includes backend profile and runtime identity
- harness creates adapter from payload backend
- current Ollama remains the first fully working backend

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/scheduler/*` |
| MODIFY | `src/worker/model-selector.ts` or replace through scheduler boundary |
| MODIFY | `src/worker/dispatch-loop.ts` |
| MODIFY | `src/harness/payload.ts` |
| MODIFY | `src/harness/runner.ts` |
| MODIFY | `src/worker/adapters/index.ts` only if still the harness adapter entry |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Dispatch no longer blocks all work on Ollama health before routing
- [ ] Harness no longer hardcodes `adapter: 'ollama'`
- [ ] Backend/model are selected by scheduler decision
- [ ] Verified capacity is used before local lease allocation
- [ ] Ollama path remains working through backend payload
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-17-strict-callback-and-recovery-predicate.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
