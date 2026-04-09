# Task M05: Migrate Layer 3 — MCP Server Internals

## Info
- **ID:** M05-migrate-layer3-mcp-internals
- **Module:** mcp-server (task-queue, poll-helpers, idle-resolver, state-manager, recovery, plan-watcher)
- **Group:** 2 (File Migration)
- **Dependencies:** M04
- **Priority:** 5
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 3, Layer 3

## What to do

Migrate 6 MCP internal modules:

### 1. `mcp-server/task-queue.mjs` → `task-queue.ts` (Medium)
- `Map<string, TaskDef>` cho internal storage
- `TaskGraph` cho DAG input
- Method return types

### 2. `mcp-server/poll-helpers.mjs` → `poll-helpers.ts` (Low)
- Generic function signatures
- Callback types: `() => Promise<T | null>`
- Timeout/interval param types

### 3. `mcp-server/idle-resolver.mjs` → `idle-resolver.ts` (Low)
- Params interface cho `resolveIdleAction`
- Return type: directive string literal union

### 4. `mcp-server/state-manager.mjs` → `state-manager.ts` (Medium)
- Class `StateManager` fully typed
- Constructor params interface
- All method signatures
- Import types cho internal deps

### 5. `mcp-server/recovery.mjs` → `recovery.ts` (Medium)
- Class `RecoveryManager` fully typed
- Constructor dependencies interface
- Checkpoint types
- Stale task handling types

### 6. `mcp-server/plan-watcher.mjs` → `plan-watcher.ts` (Low)
- Class `PlanWatcher` typed
- Stats/status return interfaces

### Import path rule
Tất cả `.mjs` → `.js` trong import paths.

## Files
| Action | Path |
|--------|------|
| RENAME + MODIFY | `src/mcp-server/task-queue.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/poll-helpers.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/idle-resolver.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/state-manager.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/recovery.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/plan-watcher.mjs` → `.ts` |

## Verification
```bash
npx tsc --noEmit
# Layer 1-3 nên pass. Errors chỉ từ Layer 4 files chưa migrate.
```

## Done Criteria
- [ ] 6 files đã rename sang `.ts`
- [ ] Classes fully typed (props, constructor, methods)
- [ ] Import paths dùng `.js`
- [ ] Shared types từ `../types.js`
- [ ] Không thay đổi logic runtime
