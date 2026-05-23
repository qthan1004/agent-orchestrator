# Task IMEDIALY-20: CLI Runtime Service Adapters

## Info
- **ID:** IMEDIALY-20-cli-runtime-service-adapters
- **Module:** Codex CLI adapter, AG CLI adapter, harness wrapper
- **Group:** Worker Harness Runtime Service Correction
- **Dependencies:** IMEDIALY-19
- **Priority:** 0
- **Plan-ID:** IMEDIALY-worker-harness-service-correction
- **Plan-Order:** 20
- **Plan-Next:** IMEDIALY-21-runtime-service-e2e-and-doc-alignment.md
- **Ref:** `dev-docs/2026-05-22_analysis_worker-harness-runtime-service-architecture.md`

## Constraints

- CLI/model does not talk to server.
- Harness wrapper owns server callback and heartbeat.
- CLI stdout may be quiet, wrapper must still report progress.
- Keep local Ollama path working.

## What to do

Wire CLI backends through runtime service adapters:

- Codex CLI service adapter starts one process/session per lease
- AG CLI service adapter starts one process/session per lease
- wrapper provides task payload and tool interface as needed
- wrapper streams stdout/stderr when available
- wrapper emits progress when CLI is quiet
- cleanup targets only matching backend/session

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/runtime-adapters/codex-cli/*` |
| MODIFY | `src/runtime-adapters/ag-cli/*` |
| MODIFY | `src/runtime/runtime-service-manager.ts` |
| MODIFY | `src/harness/*` only for shared wrapper protocol |
| MODIFY | `src/scheduler/*` |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] Codex CLI route creates isolated service/session per lease
- [x] AG CLI route creates isolated service/session per lease
- [x] CLI backends never call server directly
- [x] Harness wrapper sends callback/heartbeat/progress
- [x] Quiet CLI sessions still show alive/progress terminal lines
- [x] Cleanup kills only matching CLI session
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-21-runtime-service-e2e-and-doc-alignment.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-worker-harness-service-correction` until this plan reaches `STOP`.

