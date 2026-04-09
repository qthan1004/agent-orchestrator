# Task 03: Auto-kill Worker Disconnect & Task Requeue

## Vấn đề
Ngưỡng stale của worker để xử lý disconnected là 24h, quá lâu. Worker khác không thể tranh được task đang bị treo.

## Actions
1. **[MODIFY] `src/constants.mjs`**
   - Hạ `MONITOR_INTERVAL_MS` từ 10s xuống `5_000` (5s).
   - Hạ `STALE_THRESHOLD_MS` từ 24 tiếng xuống `10_000` (10s).
2. **[MODIFY] `src/utils/worker-registry.mjs`**
   - Thêm method `removeWorker(id)` xoá id khỏi `this.workers` và gọi `this._save()`.
3. **[MODIFY] `src/mcp-server/recovery.mjs`**
   - Sửa hàm `_handleStaleTask(worker)`.
   - Thêm lệnh kill worker (gọi `this.workerRegistry.removeWorker(worker.id)`).
4. **[MODIFY] `src/utils/startup-prompt.mjs`**
   - Đổi `staleMinutes: 30` → `staleSeconds: 10` trong DEFAULTS.
   - Đổi prompt text custom mode: `"Stale threshold (min)"` → `"Stale threshold (sec)"`.
   - Đổi default display: `"${DEFAULTS.staleMinutes} minutes"` → `"${DEFAULTS.staleSeconds} seconds"`.
   - Đổi conversion formula: `config.staleMinutes * 60_000` → `config.staleSeconds * 1_000`.
