# Task 11: Auto-heartbeat middleware (withHeartbeat)

## Info
- **ID:** 11-auto-heartbeat
- **Module:** mcp-server/tools
- **Group:** 5
- **Dependencies:** 03
- **Priority:** 2

## What to do

Tạo middleware function `withHeartbeat` — auto update heartbeat cho mọi tool call có `worker_id`.

### Implementation trong `src/mcp-server/tools.mjs`

```js
/**
 * Middleware: auto-update heartbeat cho mọi tool call có worker_id.
 * Agent không cần gọi report_progress chỉ để keepalive.
 */
function withHeartbeat(handler) {
  return async (params) => {
    if (params.worker_id) {
      workerRegistry.updateHeartbeat(params.worker_id);
    }
    return handler(params);
  };
}
```

### Áp dụng cho các tools có worker_id:
```js
server.registerTool(TOOL_NAMES.GET_NEXT_TASK, schema, withHeartbeat(getNextTaskHandler));
server.registerTool(TOOL_NAMES.COMPLETE_TASK, schema, withHeartbeat(completeTaskHandler));
server.registerTool(TOOL_NAMES.REPORT_PROGRESS, schema, withHeartbeat(reportProgressHandler));
server.registerTool(TOOL_NAMES.REQUEST_RETRY, schema, withHeartbeat(requestRetryHandler));
```

### Lưu ý
- Xóa `workerRegistry.updateHeartbeat()` calls trùng lặp trong individual handlers (đã có middleware)
- `report_progress` vẫn giữ nhưng heartbeat được handle bởi middleware, logic log giữ nguyên

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Gọi complete_task → check worker heartbeat đã update
- Gọi get_next_task → check worker heartbeat đã update
- Không cần gọi report_progress riêng để keepalive

## Done Criteria
- [ ] `withHeartbeat` middleware function
- [ ] Áp dụng cho tất cả tools có worker_id
- [ ] Xóa duplicate heartbeat calls trong handlers
- [ ] report_progress vẫn hoạt động bình thường
