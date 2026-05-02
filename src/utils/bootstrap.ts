import fs from 'fs';
import { ensureDir } from './file-backend.js';
import type { AppConfig, BootstrapResult } from '../models/index.js';

/**
 * Khởi tạo toàn bộ cây thư mục cần thiết cho hệ thống.
 * Được gọi 1 lần khi server start — đảm bảo user không cần tự tạo thủ công.
 *
 * - Nếu tất cả thư mục đã tồn tại → bỏ qua hoàn toàn.
 * - Nếu thiếu → chỉ tạo bổ sung những thư mục chưa có.
 *
 * @param config - Config object từ loadConfig()
 * @returns Object chứa created, failed, skipped
 */
export function bootstrapDirectories(config: AppConfig): BootstrapResult {
  const dirs = [
    // exchange/ tree
    config.exchange.base,
    config.exchange.inbox,
    config.exchange.active,
    config.exchange.outbox,
    config.exchange.checkpoints,
    config.exchange.logs,
    config.exchange.signals,

    // plan/ tree (state machine: pending → processing → done)
    config.plans.base,
    config.plans.pending,
    config.plans.processing,
    config.plans.done,

    // tasks/ tree (state machine: pending → processing → done)
    config.tasks.base,
    config.tasks.pending,
    config.tasks.processing,
    config.tasks.done,

    // templates/
    config.templates,
  ];

  // Phân loại: đã tồn tại vs chưa tồn tại
  const existing: string[] = [];
  const missing: string[] = [];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      existing.push(dir);
    } else {
      missing.push(dir);
    }
  }

  // Đủ bộ → bỏ qua hoàn toàn
  if (missing.length === 0) {
    return { created: [], failed: [], skipped: existing.length };
  }

  // Thiếu → chỉ tạo bổ sung
  const created: string[] = [];
  const failed: string[] = [];

  for (const dir of missing) {
    const ok = ensureDir(dir);
    if (ok) {
      created.push(dir);
    } else {
      failed.push(dir);
    }
  }

  return { created, failed, skipped: existing.length };
}
