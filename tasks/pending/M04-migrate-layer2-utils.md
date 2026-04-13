# Task M04: Migrate Layer 2 — Utils (depends on Layer 1)

## Info
- **ID:** M04-migrate-layer2-utils
- **Module:** config, utils/bootstrap, utils/worker-registry, utils/startup-prompt
- **Group:** 2 (File Migration)
- **Dependencies:** M03
- **Priority:** 4
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 3, Layer 2

## What to do

Migrate 4 files phụ thuộc Layer 1:

### 1. `src/config.mjs` → `src/config.ts`
- Import `AppConfig`, `ConfigOverrides` từ `./types.js`
- Return type `AppConfig` cho `loadConfig()`
- Parameter types cho overrides

### 2. `src/utils/bootstrap.mjs` → `src/utils/bootstrap.ts`
- Import `AppConfig`, `BootstrapResult` từ `../types.js`
- Parameter type `AppConfig` cho main function
- Return type `BootstrapResult`

### 3. `src/utils/worker-registry.mjs` → `src/utils/worker-registry.ts` (147 LOC)
- Import `WorkerInfo` từ `../types.js`
- Class properties: `workers: Map<string, WorkerInfo>`
- Method signatures: param + return types
- **Lưu ý:** File này đã lớn hơn nhất định so với plan gốc (từ 90 → 147 LOC) do thêm role tracking, `getActivePlanner()`, và planner heartbeat management trong v2 optimization
- Export class với `WorkerRegistry` type

### 4. `src/utils/startup-prompt.mjs` → `src/utils/startup-prompt.ts`
- Import `ConfigOverrides` từ `../types.js`
- Return type `Promise<ConfigOverrides>` cho `promptConfig()`
- stdin/stdout types

### Import path rule
```diff
- import { X } from './something.mjs'
+ import { X } from './something.js'
```

## Files
| Action | Path |
|--------|------|
| RENAME + MODIFY | `src/config.mjs` → `src/config.ts` |
| RENAME + MODIFY | `src/utils/bootstrap.mjs` → `src/utils/bootstrap.ts` |
| RENAME + MODIFY | `src/utils/worker-registry.mjs` → `src/utils/worker-registry.ts` |
| RENAME + MODIFY | `src/utils/startup-prompt.mjs` → `src/utils/startup-prompt.ts` |

## Verification
```bash
npx tsc --noEmit
# Layer 1 + Layer 2 files nên pass (có thể có errors từ files chưa migrate)

npx tsx -e "import { loadConfig } from './src/config.js'; console.log(typeof loadConfig)"
```

## Done Criteria
- [ ] 4 files đã rename sang `.ts`
- [ ] Import `types.js` đúng
- [ ] Tất cả class props, method params, return types đều typed
- [ ] Import paths dùng `.js`
- [ ] Không thay đổi logic runtime
