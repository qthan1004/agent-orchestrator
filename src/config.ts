import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DIR_NAMES, POLL_DEFAULTS, RECOVERY_DEFAULTS, WORKSPACE_DIR_NAME, SERVER_PROFILES } from './constants.js';
import { generateWorkspaceId } from './utils/workspace-registry.js';
import type { AppConfig, ConfigOverrides } from './models/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load application configuration.
 * workspaceRoot is required — no implicit workspace discovery.
 *
 * @param overrides - Configuration overrides from startup prompt or CLI
 * @throws Error if workspaceRoot is not provided
 */
export function loadConfig(overrides: ConfigOverrides = {}): AppConfig {
  const root = overrides.root || resolve(__dirname, '..');

  if (!overrides.workspaceRoot) {
    throw new Error(
      'workspaceRoot is required. No implicit workspace discovery allowed. ' +
      'Provide an explicit workspace path at startup.'
    );
  }

  const workspaceRoot = overrides.workspaceRoot;
  const workspaceId = generateWorkspaceId(workspaceRoot);

  const runtimeRoot = overrides.runtimeRoot || root;

  let exchangeBase: string;
  if (overrides.runtimeRoot) {
    exchangeBase = join(runtimeRoot, WORKSPACE_DIR_NAME, workspaceId, DIR_NAMES.EXCHANGE);
  } else {
    exchangeBase = join(root, DIR_NAMES.EXCHANGE);
  }

  // Workspace-local memory paths (scoped under ~/.orchestrator/workspaces/<id>/memory/)
  const workspaceRuntimeDir = join(runtimeRoot, WORKSPACE_DIR_NAME, workspaceId);
  const memoryBase = join(workspaceRuntimeDir, 'memory');
  const memoryCaseBank = join(memoryBase, 'case-bank');

  // Global shared memory paths (explicitly separated from workspace-local)
  const sharedCaseBank = join(runtimeRoot, 'shared', 'case-bank');

  const profileName = 'hybrid' as const;
  const profileConfig = SERVER_PROFILES.HYBRID;

  return {
    root,
    runtimeRoot,
    profile: profileName,
    global: {
      server: {
        port: overrides.port || 3847,
        host: overrides.host || '127.0.0.1',
      },
      polling: {
        pollTimeoutMs: overrides.pollTimeoutMs || POLL_DEFAULTS.POLL_TIMEOUT_MS,
        checkIntervalMs: overrides.checkIntervalMs || POLL_DEFAULTS.CHECK_INTERVAL_MS,
        planPollTimeoutMs: overrides.planPollTimeoutMs || POLL_DEFAULTS.PLAN_POLL_TIMEOUT_MS,
      },
      recovery: {
        staleWorkerThresholdMs: overrides.staleWorkerThresholdMs || profileConfig.staleThresholdMs,
        plannerAliveThresholdMs: overrides.plannerAliveThresholdMs || RECOVERY_DEFAULTS.PLANNER_ALIVE_THRESHOLD_MS,
        maxTaskRetries: overrides.maxTaskRetries || RECOVERY_DEFAULTS.MAX_TASK_RETRIES,
      },
      templates: join(root, DIR_NAMES.TEMPLATES),
      sharedMemory: {
        caseBank: sharedCaseBank,
      },
    },
    workspace: {
      workspaceId,
      workspaceRoot,
      exchange: {
        base: exchangeBase,
        inbox: join(exchangeBase, DIR_NAMES.INBOX),
        active: join(exchangeBase, DIR_NAMES.ACTIVE),
        outbox: join(exchangeBase, DIR_NAMES.OUTBOX),
        checkpoints: join(exchangeBase, DIR_NAMES.CHECKPOINTS),
        logs: join(exchangeBase, DIR_NAMES.LOGS),
        signals: join(exchangeBase, DIR_NAMES.SIGNALS),
      },
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
      planWatcher: {
        intervalMs: overrides.planWatcherIntervalMs || 30_000,
      },
      memory: {
        base: memoryBase,
        caseBank: memoryCaseBank,
      },
    }
  };
}
