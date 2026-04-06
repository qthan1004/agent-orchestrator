# Task 14: TaskQueue — Rename completeTask → updateTaskStatus

## Info
- **ID:** 14-task-queue-rename
- **Module:** mcp-server
- **Group:** 7 (Bug Fixes)
- **Dependencies:** 13
- **Priority:** 3

## What to do

Semantic rename: `completeTask()` → `updateTaskStatus()` trong `TaskQueue`. Tên cũ gây hiểu nhầm vì function chỉ set status, không thực sự "complete".

### 1. Rename trong `src/mcp-server/task-queue.mjs`
```js
// Before:
completeTask(taskId, status) { ... }

// After:
updateTaskStatus(taskId, status) { ... }
```

### 2. Update tất cả call sites
```bash
grep -rn "completeTask" src/
```
Thay tất cả `.completeTask(` → `.updateTaskStatus(`

Expected locations:
- `src/mcp-server/state-manager.mjs` — `moveToActive()` và `moveToOutbox()`

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/task-queue.mjs` |
| MODIFY | `src/mcp-server/state-manager.mjs` |

## Verification
- `grep -rn "completeTask" src/` → phải trả 0 results
- Server start bình thường, tools vẫn hoạt động

## Done Criteria
- [ ] Renamed function
- [ ] All call sites updated
- [ ] Zero references to old name
- [ ] No runtime errors
