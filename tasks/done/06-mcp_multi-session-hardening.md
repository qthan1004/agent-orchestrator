# Multi-session Shared State + Graceful Shutdown

- **Phase**: A3 — Multi-session + Hardening
- **Goal**: Verify 2 sessions share state, implement register_worker + graceful shutdown

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/index.mjs` |
| NEW | `src/utils/worker-registry.mjs` |

## What to Do

### 1. Worker Registry — UUID manager

Tạo `src/utils/worker-registry.mjs`:
- Class `WorkerRegistry`
- `register()` → tạo UUID (format: `w-<8chars>`), lưu vào Map
- `getWorker(id)` → return worker info
- `getAllWorkers()` → return all workers
- `updateHeartbeat(id)` → update `last_heartbeat`
- Worker data: `{ id, registered_at, last_heartbeat, current_task, tasks_completed, status }`
- Chỉ class này được tạo UUID — single source of truth

### 2. MCP Tool: register_worker

Thêm tool `register_worker` vào MCP server:
- Input: không cần params
- Logic: gọi `workerRegistry.register()`
- Output: `{ worker_id: "w-xxxxxxxx" }`

### 3. Tool: get_status update

Update `get_status` thêm `connected_workers` count từ registry.

### 4. Graceful Shutdown

Trong `src/mcp-server/index.mjs`:
```javascript
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  // Future: flush state to files
  server.close();
  process.exit(0);
});
process.on('SIGTERM', /* same handler */);
```

### 5. Test Multi-session

- Start server
- Mở 2 Antigravity sessions
- Session 1: gọi `register_worker` → nhận worker_id_1
- Session 2: gọi `register_worker` → nhận worker_id_2 (KHÁC worker_id_1)
- Session 1: gọi `get_status` → thấy `connected_workers: 2`
- Session 2: gọi `get_status` → thấy `connected_workers: 2` (CÙNG state!)

## Constraints

- UUID chỉ MCP server tạo — agent KHÔNG tự tạo
- Worker registry là in-memory ở phase này (file persistence add ở Phase C)

## Dependencies

- `05-mcp_config-mcp-remote` phải xong trước

## Verification

```bash
# Start server
node src/index.mjs serve

# Mở 2 Antigravity sessions → cả 2 gọi register_worker + get_status
# Verify cùng connected_workers count
```

## Done Criteria

- [x] `register_worker()` tạo unique UUID mỗi lần gọi
- [x] `get_status()` hiện đúng số workers connected
- [x] 2 sessions thấy cùng state (shared)
- [x] SIGINT graceful shutdown hoạt động (Ctrl+C → server dừng sạch)
- [x] Ghi observations vào `plan/orchestrator_poc-observations_v0.1.md`
