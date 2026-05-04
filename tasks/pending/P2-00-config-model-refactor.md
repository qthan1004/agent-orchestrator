# Task P2-00: Config Model Refactor

## Info
- **ID:** P2-00-config-model-refactor
- **Module:** `src/models/config.ts`, `src/config.ts`
- **Group:** Sprint 0 (3-Tier Infrastructure)
- **Dependencies:** none
- **Priority:** 1
- **Ref:** `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`

## What to do

Tách `AppConfig` thành `GlobalConfig` (workers, logs, server) + `WorkspaceConfig` (pipeline, queue, plans). Thêm `runtimeRoot` config (mặc định `~/.orchestrator/`). `loadConfig()` resolve exchange paths từ `runtimeRoot` thay vì `root`. Thêm `workspaceId` (hash từ workspace path).

### Key changes:

1. **`src/models/config.ts`**: Thêm `GlobalConfig`, `WorkspaceConfig` interfaces. `AppConfig` aggregate cả hai.
2. **`src/config.ts`**: `loadConfig()` nhận optional `runtimeRoot`. Resolve exchange paths từ `runtimeRoot`. 
3. **`src/constants.ts`**: Thêm `RUNTIME_DIR_NAME`, `WORKSPACE_DIR_NAME`, default runtime path.
4. **Backward compat**: Nếu `runtimeRoot` không set → fallback `root/exchange/` như cũ.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/models/config.ts` |
| MODIFY | `src/config.ts` |
| MODIFY | `src/constants.ts` |

## Verification
```bash
npm run build
npm test
```

## Done Criteria
- [ ] `AppConfig` có `runtimeRoot: string`
- [ ] `WorkspaceConfig` interface tách ra
- [ ] `loadConfig({ runtimeRoot })` resolve đúng paths
- [ ] Fallback backward compat khi không set `runtimeRoot`
- [ ] `npm run build` pass
