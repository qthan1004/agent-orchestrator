# Task IMEDIALY-14: Runtime Service Adapter Boundary

## Info
- **ID:** IMEDIALY-14-runtime-service-adapter-boundary
- **Module:** runtime service manager, backend adapter boundary
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-13
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 14
- **Plan-Next:** IMEDIALY-15-dispatch-through-runtime-service-manager.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- Do not create a god `WorkerManager`.
- `RuntimeManager` remains lease lifecycle owner.
- Adapter owns backend-specific spawn/ready/probe/kill/cleanup.
- Keep behavior compatible for current Ollama path.

## What to do

Introduce a narrow runtime service adapter boundary:

- `RuntimeServiceAdapter`
- `RuntimeServiceHandle`
- adapter registry/lookup by backend
- current Ollama harness path wrapped as first adapter
- no Codex/AG behavior expansion yet
- remove spray-and-pray intent from new code paths

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime/runtime-service-manager.ts` |
| MODIFY | `src/runtime/models.ts` |
| MODIFY | `src/runtime/index.ts` |
| MODIFY | `src/runtime-adapters/ollama/*` |
| MODIFY | `src/runtime/runtime-manager.ts` only to delegate service mechanics |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [ ] Runtime service adapter interface exists
- [ ] Current Ollama path works through adapter boundary
- [ ] `RuntimeManager` owns lease orchestration, not backend internals
- [ ] No new `WorkerManager` owns task/runtime/backend together
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-15-dispatch-through-runtime-service-manager.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.
