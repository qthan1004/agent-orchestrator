# Task IMEDIALY-10: Audit Worker Harness Runtime Service Gaps

## Info
- **ID:** IMEDIALY-10-audit-worker-harness-runtime-service-gaps
- **Module:** runtime, harness, scheduler, recovery, visibility
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-09
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 10
- **Plan-Next:** IMEDIALY-11-runtime-service-contracts-and-events.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- No runtime behavior changes.
- No broad rename.
- Do not create `WorkerManager` as a new owner.
- Treat `Worker = Harness instance`, not model/CLI/backend.

## What to do

Map current implementation against the canonical architecture before touching behavior:

- list current hardcoded Ollama paths
- list current silent or hidden harness phases
- list current ready/callback/recovery gaps
- list existing stores/contracts that should be reused
- identify the smallest next code boundary for each later task

## Files
| Action | Path |
|--------|------|
| NEW | `dev-docs/2026-05-22_audit_worker-harness-runtime-service-gaps.md` |
| READ | `src/runtime/*` |
| READ | `src/harness/*` |
| READ | `src/worker/dispatch-loop.ts` |
| READ | `src/mcp-server/*` |

## Verification

```bash
npm run typecheck
```

## Done Criteria

- [ ] Audit points to concrete files/functions
- [ ] No code behavior changed
- [ ] Later tasks can use the audit as a checklist
- [ ] Audit confirms which existing contracts must be reused
- [ ] `npm run typecheck` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-11-runtime-service-contracts-and-events.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
