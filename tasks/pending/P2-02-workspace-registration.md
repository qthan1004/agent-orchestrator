# Task P2-02: Workspace Registration Flow

## Info
- **ID:** P2-02-workspace-registration
- **Module:** `src/utils/workspace-registry.ts` (NEW), `src/mcp-server/tools.ts`
- **Group:** Sprint 0 (3-Tier Infrastructure)
- **Dependencies:** P2-01
- **Priority:** 3
- **Ref:** `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`

## What to do

Tạo `WorkspaceRegistry` class và integrate vào `register_worker` tool.

### Key changes:

1. **[NEW] `src/utils/workspace-registry.ts`**:
   - `register(workspacePath: string)` → `{ id: string, path: string }`
   - `workspaceId` = SHA256(absolutePath).slice(0, 8)
   - Lưu metadata: `{ path, registered_at, name (basename) }`
   - Persist registry ở `~/.orchestrator/workspaces.json`
   - `getAll()` → list all registered workspaces
   - `getById(id)` → workspace metadata
   - Idempotent: same path → same ID, no duplicate

2. **MODIFY `src/mcp-server/tools.ts`**:
   - `register_worker({ workspace_path })` → auto-register workspace via WorkspaceRegistry
   - Call `bootstrapWorkspace(workspaceId)` to create runtime dirs
   - Return `workspaceId` in response

## Files
| Action | Path |
|--------|------|
| NEW | `src/utils/workspace-registry.ts` |
| MODIFY | `src/mcp-server/tools.ts` |

## Verification
```bash
npm run build
# Gọi register_worker({ workspace_path: '/tmp/test-project' })
# → workspace dir tạo, workspaceId trả về
```

## Done Criteria
- [ ] `WorkspaceRegistry.register('/path/to/project')` → `{ id: 'a1b2c3d4', path: '...' }`
- [ ] `~/.orchestrator/workspaces/a1b2c3d4/` tồn tại
- [ ] `workspaces.json` ghi mapping
- [ ] Gọi lại cùng path → trả cùng ID (idempotent)
- [ ] `register_worker` response có `workspace_id`
