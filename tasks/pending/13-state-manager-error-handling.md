# Task 13: StateManager — Error handling moveToActive/Outbox

## Info
- **ID:** 13-state-manager-error-handling
- **Module:** mcp-server
- **Group:** 7 (Bug Fixes)
- **Dependencies:** none
- **Priority:** 2

## What to do

Fix task lock bug: Thêm error handling cho file operations trong `StateManager`.

### 1. `moveToActive` — throw nếu move fail
```js
moveToActive(taskId) {
  const src = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
  const dest = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);

  const moved = moveFile(src, dest);
  if (!moved) {
    throw new Error(`Failed to move task ${taskId} from inbox to active: file not found or permission error`);
  }
  
  // Rest of logic (update status in file + queue)...
}
```

### 2. `moveToOutbox` — throw nếu move fail
```js
moveToOutbox(taskId, result) {
  const src = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
  const dest = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

  const moved = moveFile(src, dest);
  if (!moved) {
    throw new Error(`Failed to move task ${taskId} from active to outbox: file not found or permission error`);
  }
  
  // Rest of logic...
}
```

### 3. Kiểm tra `moveFile` return value
Xác nhận `src/utils/file-backend.mjs` `moveFile()` return boolean khi fail thay vì throw. Nếu throw → dùng try/catch thay vì check return value.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/state-manager.mjs` |
| CHECK | `src/utils/file-backend.mjs` (xác nhận moveFile behavior) |

## Verification
- Gọi `moveToActive` với task_id không tồn tại → phải throw error
- Gọi `moveToOutbox` khi task không ở active/ → phải throw error
- Error message phải rõ ràng cho debugging

## Done Criteria
- [ ] `moveToActive` throw khi file move fail
- [ ] `moveToOutbox` throw khi file move fail
- [ ] Error messages descriptive
- [ ] Tool handlers (`complete_task`, `get_next_task`) catch errors gracefully
