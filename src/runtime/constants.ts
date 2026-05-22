export const RUNTIME_BACKEND = {
  OLLAMA: 'ollama',
  CODEX_CLI: 'codex-cli',
  AG_CLI: 'ag-cli',
} as const;

export const RUNTIME_ISOLATION = {
  SHARED_DEV: 'shared-dev',
  LEASE_LOCAL: 'lease-local',
  CLI_SESSION: 'cli-session',
} as const;

export const RUNTIME_LEASE_STATUS = {
  RESERVED: 'reserved',
  STARTING: 'starting',
  ACTIVE: 'active',
  STALE: 'stale',
  RELEASING: 'releasing',
  RELEASED: 'released',
  FAILED: 'failed',
} as const;

export const RUNTIME_HEARTBEAT_STATUS = {
  HEALTHY: 'healthy',
  STALE: 'stale',
  LOST: 'lost',
} as const;

export const RUNTIME_TIMING_DEFAULTS = {
  MIN_HEALTH_CHECK_INTERVAL_MS: 1_000,
  MAX_HEALTH_CHECK_LEAD_MS: 5_000,
  HEALTH_CHECK_LEAD_RATIO: 0.2,
  DEFAULT_WORKER_MAX_RUNTIME_MS: 5 * 60 * 1000,
  FORCE_KILL_GRACE_MS: 3_000,
} as const;

export const RUNTIME_PROCESS_TEXT = {
  SPAWN_FAILED: 'Failed to spawn child process',
  NO_TASK: 'none',
  STDOUT_LINE: (workerId: string, line: string) => `  │ \x1b[36m[${workerId}]\x1b[0m ${line}`,
  STDERR_LINE: (workerId: string, line: string) => `  │ \x1b[33m[${workerId}]\x1b[0m ${line}`,
  STILL_RUNNING: (workerId: string, elapsedSeconds: number, taskId: string) => `  │ \x1b[90m[${workerId}] still running ${elapsedSeconds}s — task: ${taskId}\x1b[0m`,
  EXITED: (workerId: string, exitInfo: string, pid: number) => `  └─ \x1b[90m[${workerId}] Worker exited (${exitInfo}) — PID ${pid}\x1b[0m`,
  SPAWNED: (workerId: string, pid: number, taskId: string) => `  ┌─ \x1b[32m[${workerId}] Worker spawned\x1b[0m — PID ${pid} — task: ${taskId}`,
} as const;
