# Recovery Module + Crash Recovery Test

- **Phase**: C — File IPC + Core MCP Tools
- **Goal**: Implement recovery logic (timeout, retry, orphan requeue) + verify crash recovery

## Files

| Action | Path |
|--------|------|
| NEW | `src/mcp-server/recovery.mjs` |
| MODIFY | `src/mcp-server/index.mjs` |

## What to Do

### 1. `src/mcp-server/recovery.mjs`

```javascript
class RecoveryManager {
  constructor(stateManager, taskQueue, workerRegistry, logger, config)

  // Timeout detection
  startMonitoring()                // Interval check mỗi 10s
  checkStaleWorkers()              // Workers không heartbeat > 30s → stale
  handleStaleTask(taskId)          // Active task không có heartbeat → requeue

  // Orphan detection (sau crash)
  detectOrphans()                  // Scan active/ → tasks không có active worker
  requeueOrphans()                 // Move orphaned tasks active → inbox

  // Shutdown detection
  markCleanShutdown()              // Write exchange/.shutdown_clean
  wasCleanShutdown()               // Check file exists
  clearShutdownMarker()            // Remove file
}
```

### 2. Startup Recovery Flow

Trong `src/mcp-server/index.mjs`, thêm startup logic:

```
Server start:
1. Check exchange/.shutdown_clean?
   → YES: clean shutdown → load checkpoint normally
   → NO:  unclean crash → run detectOrphans() + requeueOrphans()
2. Load checkpoint (latest từ checkpoints/)
3. Restore queue state từ files (inbox + active + outbox)
4. Start monitoring interval
5. Clear shutdown marker
6. Ready!
```

### 3. Graceful Shutdown Update

```
SIGINT/SIGTERM:
1. Stop monitoring interval
2. Flush state → saveCheckpoint()
3. Write .shutdown_clean marker
4. Log SERVER_SHUTDOWN event
5. Close HTTP server
6. Exit
```

### 4. Test Scenarios

**Test 1 — Normal restart:**
1. Start server → load fake tasks → checkpoint
2. Ctrl+C (graceful shutdown)
3. Start lại → verify state restored correctly

**Test 2 — Crash recovery:**
1. Start server → assign task to worker
2. `kill -9` (force kill, no SIGINT handler)
3. Start lại → verify:
   - `.shutdown_clean` KHÔNG tồn tại
   - Orphan task detected (in active/ but no worker)
   - Task requeued to inbox/
   - Log ghi ORPHAN_DETECTED event

## Constraints

- Monitoring interval: 10s (configurable)
- Stale threshold: 30s since last heartbeat
- Max retries: 3 per task
- Recovery PHẢI log tất cả actions

## Dependencies

- `13-mcp_implement-all-tools` phải xong trước

## Verification

```bash
# Test crash recovery:
node src/index.mjs serve &
# (tạo fake task trong active/)
kill -9 $!
node src/index.mjs serve
# Check logs: should show orphan detection
cat exchange/logs/$(date +%Y-%m-%d).md
```

## Done Criteria

- [ ] `recovery.mjs` implements stale worker detection
- [ ] Orphan tasks requeued after unclean shutdown
- [ ] `.shutdown_clean` marker pattern works
- [ ] Checkpoint restore on startup
- [ ] Monitoring interval runs every 10s
- [ ] All recovery actions logged
