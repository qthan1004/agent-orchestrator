# Task M02: Shared Type Definitions

## Info
- **ID:** M02-shared-types
- **Module:** src/types.ts
- **Group:** 1 (Migration Foundation)
- **Dependencies:** M01
- **Priority:** 2
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 2

## What to do

Tạo file `src/types.ts` chứa tất cả shared interfaces. File này là type-only, không chứa runtime code.

### [NEW] `src/types.ts`

Tạo interfaces cho tất cả domain objects. Tham khảo chi tiết trong `dev-docs/migrate-to-typescript.md` — Phase 2, section "Type Definitions".

Danh sách interfaces cần tạo:

| Interface | Mô tả |
|-----------|-------|
| `WorkerInfo` | Worker metadata (id, role, heartbeat, status) |
| `TaskDef` | Task definition (id, module, action, verification) |
| `TaskResult` | Completed task result |
| `TaskGroup` | DAG group (group_id, tasks, depends_on) |
| `TaskGraph` | Full DAG graph (groups[]) |
| `ExchangeConfig` | Exchange directory paths |
| `DirConfig` | Generic dir config (base, pending, processing, done) |
| `AppConfig` | Full application config (recovery: staleThresholdMs, plannerAliveThresholdMs, maxTaskRetries) |
| `ConfigOverrides` | Partial config for overrides (thêm plannerAliveThresholdMs, maxTaskRetries) |
| `PlanCheckResult` | Plan check response |
| `PlanQuickStatus` | Quick plan status |
| `ServerContext` | Server-wide dependencies container |
| `ToolResponse` | MCP tool response shape |
| `BootstrapResult` | Bootstrap dir creation result |

> **Quan trọng:** Đọc kỹ từng `.mjs` file hiện tại để đảm bảo interfaces match đúng shape thực tế. Doc trong `dev-docs/migrate-to-typescript.md` là reference, nhưng code hiện tại là source of truth.

## Files
| Action | Path |
|--------|------|
| NEW    | `src/types.ts` |

## Verification
```bash
npx tsc --noEmit src/types.ts
# Expected: 0 errors (hoặc import errors do chưa có .ts files khác — OK)
```

## Done Criteria
- [x] `src/types.ts` tồn tại
- [x] Tất cả 14 interfaces listed ở trên đều được export
- [x] Không có runtime code (chỉ `type`/`interface`/`export type`)
- [x] Interfaces match shape thực tế trong `.mjs` files
