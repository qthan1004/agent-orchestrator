# Task P2-03: StateManager Path Migration

## Info
- **ID:** P2-03-statemanager-path-migration
- **Module:** `src/mcp-server/state-manager.ts`, `src/mcp-server/recovery.ts`
- **Group:** Sprint 0 (3-Tier Infrastructure)
- **Dependencies:** P2-00, P2-02
- **Priority:** 4
- **Ref:** `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

StateManager resolve paths từ workspace-scoped runtime dirs thay vì `AppConfig.exchange`.

### Key changes:

1. **`src/mcp-server/state-manager.ts`**:
   - Constructor nhận `WorkspaceConfig` (paths đã resolve per-workspace)
   - `storeTasks()` → ghi vào `~/.orchestrator/workspaces/<id>/pipeline/inbox/`
   - `moveToActive()` → `pipeline/inbox/` → `pipeline/active/`
   - `moveToOutbox()` → `pipeline/active/` → `pipeline/outbox/`
   - `moveToInbox()` (requeue) → `pipeline/active/` → `pipeline/inbox/`
   - `restoreFromFiles()` → scan workspace-scoped pipeline dirs
   - `saveCheckpoint()` → `workspaces/<id>/checkpoints/`
   - `checkPlans()` → `workspaces/<id>/plans/processing/`

2. **`src/mcp-server/recovery.ts`**:
   - `_markerPath` → `~/.orchestrator/.shutdown_clean`
   - `detectOrphans()` → scan workspace `pipeline/active/`
   - Checkpoint paths updated

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/state-manager.ts` |
| MODIFY | `src/mcp-server/recovery.ts` |

## Verification
```bash
npm run build
# E2E: submit_decomposition → tasks nằm trong ~/.orchestrator/workspaces/<id>/pipeline/inbox/
```

## Done Criteria
- [x] Task files ghi vào `~/.orchestrator/workspaces/<id>/pipeline/` thay vì `exchange/`
- [x] Recovery scan đúng workspace dirs
- [x] Checkpoint ghi vào workspace-scoped dir
- [x] `npm run build` pass
- [x] Existing E2E tests pass (with updated paths)
