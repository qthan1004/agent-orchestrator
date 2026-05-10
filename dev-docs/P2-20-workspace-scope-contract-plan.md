# P2-20: Workspace Scope Contract

This plan formalizes the workspace identity and runtime layout contract according to the requirements in task `P2-20-workspace-scope-contract.md`. 

## User Review Required

> [!IMPORTANT]
> **Global vs. Workspace-local Case Bank**
> The Phase 2 documentation (`workspace-memory.md`) mentions a global cross-project case bank. However, the task states `memory/case-bank roots per workspace` and `Any global/shared memory must be explicitly separated`. 
> 
> **Decision**: I propose adding both. `WorkspaceConfig` will have a `memory.caseBank` (local to the workspace), and `GlobalConfig` will have a `sharedMemory.caseBank` (cross-workspace explicitly separated). Please confirm if this dual approach is what you want.

> [!WARNING]
> **Plan/Task Directory Location**
> Currently, `src/config.ts` hardcodes `plans` and `tasks` directories to the orchestrator's root folder (`config.root`), meaning all workspaces might share the same `plan/` directory. 
> 
> **Decision**: Should `plans` and `tasks` directories be moved to be inside the target `workspaceRoot` (e.g., `workspaceRoot/plan`), or inside the `runtimeRoot` (`~/.orchestrator/workspaces/<id>/plan`)? For this plan, I will leave `plans/tasks` as is unless instructed otherwise, focusing only on the explicit directory roots mentioned in the task.

## Open Questions

- Should the `REGISTER_WORKER` tool be the *only* way a workspace is registered, or is the startup CLI prompt sufficient to define the "default" workspace? Making `workspace_path` strictly required on `REGISTER_WORKER` breaks backward compatibility if any old prompt didn't send it. (I will make it required as per task).

## Proposed Changes

### `src/models/` (Data Contracts)

#### [MODIFY] `config.ts`
- Change `WorkspaceConfig.workspaceRoot` from `string | null` to `string`.
- Change `ConfigOverrides.workspaceRoot` from `string | null` to `string`.
- Add `memory` interface to `WorkspaceConfig` containing `base` and `caseBank`.
- Add `sharedMemory` interface to `GlobalConfig` containing `caseBank` explicitly separated.

#### [MODIFY] `workspace.ts` (if needed, or `worker.ts`)
- Ensure worker registration types require `workspace_path`.

---

### Core Configuration & Utility

#### [MODIFY] `src/config.ts`
- Remove the `'default'` fallback for `workspaceId` generation. If `workspaceRoot` is missing, throw an error to enforce the contract ("No implicit workspace discovery").
- Update `workspaceId` derivation to use SHA-256 to match `WorkspaceRegistry`, or export a shared helper function so both use the same hashing algorithm.
- Add configuration for the new workspace-local `memory/caseBank` root (e.g., `~/.orchestrator/workspaces/<id>/memory/case-bank`).
- Add configuration for global `sharedMemory/caseBank` root (e.g., `~/.orchestrator/shared/case-bank`).

#### [MODIFY] `src/utils/bootstrap.ts`
- Refactor `bootstrapWorkspace(config: WorkspaceConfig)` to take the workspace configuration object instead of hardcoding `pipeline/...` strings.
- Ensure the directories actually created match the `WorkspaceConfig` structure (`exchange/inbox`, `exchange/checkpoints`, `memory/case-bank`, etc.).

#### [MODIFY] `src/utils/workspace-registry.ts`
- Export the `generateWorkspaceId(workspacePath: string)` helper so it can be reused by `config.ts`, ensuring ID derivation is strictly consistent across the codebase.

---

### MCP Tools

#### [MODIFY] `src/mcp-server/tools.ts`
- In `REGISTER_WORKER`: 
  - Change `workspace_path` from `.optional()` to `.required()` in `inputSchema`.
  - Validate that the registered path derives to the correct `workspace_id`.
- Update `SESSION_CHECKPOINT` to ensure it respects the strict workspace boundary paths.

## Verification Plan

### Automated Tests / Validation
- Run `npm run typecheck` to ensure the strict `workspaceRoot: string` does not break other orchestrator systems (like CLI startup).
- Start the server using `npm run dev` and verify that the `bootstrapWorkspace` function correctly creates the directories under `~/.orchestrator/workspaces/<id>/` matching the config (`exchange/inbox`, `memory/case-bank`, etc., instead of the legacy `pipeline/`).

### Manual Verification
- Attempt to call `register_worker` without a `workspace_path` and verify it fails.
- Call `register_worker` with a valid `workspace_path` and verify it returns the correct `workspace_id`.
- Verify the global vs local case-bank directories are created properly in `~/.orchestrator/`.
