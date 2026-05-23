import fs from 'fs';
import { basename, join } from 'path';
import { ensureDir } from './file-backend.js';
import { DIR_NAMES, FILE_PREFIXES, RUNTIME_DIR_NAME, WORKSPACE_DIR_NAME } from '../constants.js';
import type { AppConfig } from '../models/config.js';
import type { BootstrapResult } from '../models/bootstrap.js';

export interface WorkspaceBootstrapMetadata {
  id: string;
  path: string;
  name?: string;
  status?: string;
  registered_at?: string;
  closed_at?: string;
}

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
 * Khởi tạo workspace-local orchestration structure.
 * Canonical root: <workspace>/.orchestrator/
 *
 * @param workspacePath - Absolute workspace path.
 * @param metadata - Optional workspace registry metadata.
 * @returns Object chứa created, failed, skipped
 */
export function bootstrapWorkspace(
  workspacePath: string,
  metadata?: WorkspaceBootstrapMetadata
): BootstrapResult {
  const orchestratorDir = join(workspacePath, RUNTIME_DIR_NAME);
  const registryDir = join(orchestratorDir, DIR_NAMES.REGISTRY);
  const exchangeDir = join(orchestratorDir, DIR_NAMES.EXCHANGE);
  const plansDir = join(orchestratorDir, DIR_NAMES.PLANS);
  const dirs = [
    orchestratorDir,
    registryDir,
    exchangeDir,
    join(exchangeDir, 'inbox'),
    join(exchangeDir, 'active'),
    join(exchangeDir, 'outbox'),
    join(exchangeDir, 'checkpoints'),
    join(exchangeDir, 'logs'),
    join(exchangeDir, 'signals'),
    plansDir,
    join(plansDir, 'pending'),
    join(plansDir, 'processing'),
    join(plansDir, 'done'),
    join(orchestratorDir, DIR_NAMES.PLANNER),
    join(orchestratorDir, DIR_NAMES.PLANNER, 'workflows'),
    join(orchestratorDir, DIR_NAMES.SKILLS),
    join(orchestratorDir, DIR_NAMES.CONTEXT),
    join(orchestratorDir, DIR_NAMES.RESULTS),
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

  const defaultWorkspace = {
    id: metadata?.id || '',
    path: metadata?.path || workspacePath,
    name: metadata?.name || basename(workspacePath),
    status: metadata?.status || 'active',
    registered_at: metadata?.registered_at || new Date().toISOString(),
    ...(metadata?.closed_at ? { closed_at: metadata.closed_at } : {})
  };

  const registryFiles: Array<{ path: string; value: unknown }> = [
    { path: join(registryDir, 'workspace.json'), value: defaultWorkspace },
    { path: join(registryDir, 'planners.json'), value: [] },
    { path: join(registryDir, 'workers.json'), value: [] },
    { path: join(registryDir, 'tasks.json'), value: [] },
    { path: join(exchangeDir, FILE_PREFIXES.QUEUE), value: { groups: [] } },
  ];

  for (const file of registryFiles) {
    if (fs.existsSync(file.path)) {
      skippedCount++;
      continue;
    }
    try {
      fs.writeFileSync(file.path, JSON.stringify(file.value, null, 2), 'utf-8');
      created.push(file.path);
    } catch (e) {
      failed.push(file.path);
    }
  }

  return { created, failed, skipped: skippedCount };
}
