import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DIR_NAMES, POLL_DEFAULTS, RECOVERY_DEFAULTS } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadConfig(overrides = {}) {
  const root = overrides.root || resolve(__dirname, '..');
  return {
    root,
    workspaceRoot: overrides.workspaceRoot || null,
    exchange: {
      base: join(root, DIR_NAMES.EXCHANGE),
      inbox: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.INBOX),
      active: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.ACTIVE),
      outbox: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.OUTBOX),
      checkpoints: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.CHECKPOINTS),
      logs: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.LOGS),
    },
    templates: join(root, DIR_NAMES.TEMPLATES),
    plans: {
      base: join(root, DIR_NAMES.PLAN),
      pending: join(root, DIR_NAMES.PLAN, DIR_NAMES.PENDING),
      processing: join(root, DIR_NAMES.PLAN, DIR_NAMES.PROCESSING),
      done: join(root, DIR_NAMES.PLAN, DIR_NAMES.DONE),
    },
    tasks: {
      base: join(root, DIR_NAMES.TASKS),
      pending: join(root, DIR_NAMES.TASKS, DIR_NAMES.PENDING),
      processing: join(root, DIR_NAMES.TASKS, DIR_NAMES.PROCESSING),
      done: join(root, DIR_NAMES.TASKS, DIR_NAMES.DONE),
    },
    server: {
      port: overrides.port || 3847,
      host: overrides.host || '127.0.0.1',
    },
    planWatcher: {
      intervalMs: overrides.planWatcherIntervalMs || 30_000, // 30s default
    },
    polling: {
      pollTimeoutMs: overrides.pollTimeoutMs || POLL_DEFAULTS.POLL_TIMEOUT_MS,
      checkIntervalMs: overrides.checkIntervalMs || POLL_DEFAULTS.CHECK_INTERVAL_MS,
      planPollTimeoutMs: overrides.planPollTimeoutMs || POLL_DEFAULTS.PLAN_POLL_TIMEOUT_MS,
    },
    recovery: {
      staleWorkerThresholdMs: overrides.staleWorkerThresholdMs || RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS,
      plannerAliveThresholdMs: overrides.plannerAliveThresholdMs || RECOVERY_DEFAULTS.PLANNER_ALIVE_THRESHOLD_MS,
      maxTaskRetries: overrides.maxTaskRetries || RECOVERY_DEFAULTS.MAX_TASK_RETRIES,
    }
  };
}
