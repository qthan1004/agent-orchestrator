# Task M03: Migrate Layer 1 — Leaf Modules

## Info
- **ID:** M03-migrate-layer1-leaves
- **Module:** constants, utils/file-backend, utils/logger
- **Group:** 2 (File Migration)
- **Dependencies:** M02
- **Priority:** 3
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 3, Layer 1

## What to do

Migrate 3 leaf modules (không có internal deps) từ `.mjs` → `.ts`:

### 1. `src/constants.mjs` → `src/constants.ts`

- Rename file
- Thêm `as const` cho tất cả constant objects
- Tạo type unions từ const objects: `export type TaskStatusValue = typeof TASK_STATUS[keyof typeof TASK_STATUS]`
- Áp dụng cho: `VERSION`, `TASK_STATUS`, `WORKER_STATUS`, `WORKER_ROLE`, `AGENT_ACTION`, `STATE_EVENTS`, `RECOVERY_EVENTS`, `TOOL_NAMES`, `DIR_NAMES`, `API_ROUTES`, `FILE_PREFIXES`, `POLL_DEFAULTS`, `RECOVERY_DEFAULTS`, `PROCESS_SIGNALS`, `SHUTDOWN_SIGNALS`, `SHUTDOWN_MARKER_FILE`
- **Lưu ý:** `RECOVERY_DEFAULTS` giờ có thêm `PLANNER_ALIVE_THRESHOLD_MS` và `MAX_TASK_RETRIES` (không có trong plan gốc, đã thêm trong v2 optimization)

### 2. `src/utils/file-backend.mjs` → `src/utils/file-backend.ts`

- Rename file
- Import types từ `../types.js`
- Thêm return types cho tất cả functions
- Thêm parameter types

### 3. `src/utils/logger.mjs` → `src/utils/logger.ts`

- Rename file
- Thêm class property types
- Thêm method parameter + return types

### Import path rule

Tất cả import paths trong các file đã migrate:
```diff
- import { X } from './something.mjs'
+ import { X } from './something.js'
```

> **Lưu ý:** Các file `.mjs` KHÁC chưa migrate vẫn import file cũ (`.mjs`). Chỉ sửa import path TRONG các file đang migrate.

## Files
| Action | Path |
|--------|------|
| RENAME + MODIFY | `src/constants.mjs` → `src/constants.ts` |
| RENAME + MODIFY | `src/utils/file-backend.mjs` → `src/utils/file-backend.ts` |
| RENAME + MODIFY | `src/utils/logger.mjs` → `src/utils/logger.ts` |

## Verification
```bash
npx tsc --noEmit
# Check chỉ 3 files này — có thể có errors từ files khác chưa migrate (OK)

# Spot check constants
npx tsx -e "import { TASK_STATUS } from './src/constants.js'; console.log(TASK_STATUS)"
```

## Done Criteria
- [ ] 3 files đã rename sang `.ts`
- [ ] Tất cả constant objects có `as const`
- [ ] Type unions exported cho mỗi const object
- [ ] Return types + param types trên tất cả functions/methods
- [ ] Import paths dùng `.js` (không `.mjs`)
- [ ] Không thay đổi logic runtime
