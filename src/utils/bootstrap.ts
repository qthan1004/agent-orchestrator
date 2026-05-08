import fs from 'fs';
import { join } from 'path';
import { ensureDir } from './file-backend.js';
import { WORKSPACE_DIR_NAME } from '../constants.js';
import type { AppConfig } from '../models/config.js';
import type { BootstrapResult } from '../models/bootstrap.js';

/**
 * Khởi tạo toàn bộ cây thư mục cần thiết cho hệ thống (global).
 *
 * @param config - Config object từ loadConfig()
 * @returns Object chứa created, failed, skipped
 */
export function bootstrapDirectories(config: AppConfig): BootstrapResult {
  const dirs = [
    config.runtimeRoot,
    join(config.runtimeRoot, 'logs'),
    join(config.runtimeRoot, WORKSPACE_DIR_NAME),
  ];

  if (config.global && config.global.templates) {
    dirs.push(config.global.templates);
  }

  const existing: string[] = [];
  const missing: string[] = [];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      existing.push(dir);
    } else {
      missing.push(dir);
    }
  }

  if (missing.length === 0) {
    return { created: [], failed: [], skipped: existing.length };
  }

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

/**
 * Khởi tạo per-workspace structure.
 *
 * @param runtimeRoot - root path (e.g. ~/.orchestrator)
 * @param workspaceId - hashed workspace ID
 * @returns Object chứa created, failed, skipped
 */
export function bootstrapWorkspace(runtimeRoot: string, workspaceId: string): BootstrapResult {
  const workspaceDir = join(runtimeRoot, WORKSPACE_DIR_NAME, workspaceId);
  const dirs = [
    workspaceDir,
    join(workspaceDir, 'pipeline'),
    join(workspaceDir, 'pipeline', 'inbox'),
    join(workspaceDir, 'pipeline', 'active'),
    join(workspaceDir, 'pipeline', 'outbox'),
    join(workspaceDir, 'checkpoints'),
    join(workspaceDir, 'plans'),
    join(workspaceDir, 'plans', 'processing'),
    join(workspaceDir, 'plans', 'done'),
  ];

  const existing: string[] = [];
  const missing: string[] = [];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      existing.push(dir);
    } else {
      missing.push(dir);
    }
  }

  let skippedCount = existing.length;
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

  // queue.json initialization
  const queueFile = join(workspaceDir, 'queue.json');
  if (!fs.existsSync(queueFile)) {
    try {
      fs.writeFileSync(queueFile, JSON.stringify({ pending: [], processing: [], done: [] }, null, 2), 'utf-8');
      created.push(queueFile);
    } catch (e) {
      failed.push(queueFile);
    }
  } else {
    skippedCount++;
  }

  return { created, failed, skipped: skippedCount };
}
