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
  READY: 'ready',
  RUNNING: 'running',
  ACTIVE: 'active',
  COMPLETING: 'completing',
  HANDOVER_REQUIRED: 'handover_required',
  CLOSED: 'closed',
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

export const RUNTIME_HEALTH_PROBE_STATUS = {
  UNKNOWN: 'unknown',
  PASSED: 'passed',
  FAILED: 'failed',
} as const;

export const RUNTIME_SERVICE_STATUS = {
  STARTING: 'starting',
  READY: 'ready',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  FAILED: 'failed',
} as const;

export const RUNTIME_TERMINAL_CALLBACK_STATUS = {
  COMPLETE: 'complete',
  FAILED: 'failed',
  HANDOVER_REQUIRED: 'handover_required',
} as const;

export const RUNTIME_READY_STEP = {
  PROCESS_SPAWNED: 'process_spawned',
  PAYLOAD_PARSED: 'payload_parsed',
  RUNTIME_IDENTITY_VERIFIED: 'runtime_identity_verified',
  TASK_SOURCE_REACHABLE: 'task_source_reachable',
  BACKEND_ADAPTER_INITIALIZED: 'backend_adapter_initialized',
  MODEL_SESSION_REACHABLE: 'model_session_reachable',
  HEARTBEAT_REGISTERED: 'heartbeat_registered',
  READY_CALLBACK_ACCEPTED: 'ready_callback_accepted',
} as const;

export const WARM_MODEL_CACHE_DEFAULTS = {
  TTL_MS: 10 * 60 * 1000,
  RETAIN_ON_RELEASE: true,
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
  RUNTIME_PREFIX: (workerId: string, taskId: string, runtimeId: string, leaseGeneration: number) =>
    `[worker=${workerId} task=${taskId} runtime=${runtimeId} lease=${leaseGeneration}]`,
  STDOUT_LINE: (workerId: string, line: string) => `  │ \x1b[36m[${workerId}]\x1b[0m ${line}`,
  STDERR_LINE: (workerId: string, line: string) => `  │ \x1b[33m[${workerId}]\x1b[0m ${line}`,
  STDOUT_RUNTIME_LINE: (prefix: string, line: string) => `  │ \x1b[36m${prefix}\x1b[0m ${line}`,
  STDERR_RUNTIME_LINE: (prefix: string, line: string) => `  │ \x1b[33m${prefix}\x1b[0m ${line}`,
  STILL_RUNNING_RUNTIME: (prefix: string, elapsedSeconds: number) => `  │ \x1b[90m${prefix} still running ${elapsedSeconds}s\x1b[0m`,
  STILL_RUNNING: (workerId: string, elapsedSeconds: number, taskId: string) => `  │ \x1b[90m[${workerId}] still running ${elapsedSeconds}s — task: ${taskId}\x1b[0m`,
  EXITED: (workerId: string, exitInfo: string, pid: number) => `  └─ \x1b[90m[${workerId}] Worker exited (${exitInfo}) — PID ${pid}\x1b[0m`,
  EXITED_RUNTIME: (prefix: string, exitInfo: string, pid: number) => `  └─ \x1b[90m${prefix} Harness exited (${exitInfo}) — PID ${pid}\x1b[0m`,
  SPAWNED: (workerId: string, pid: number, taskId: string) => `  ┌─ \x1b[32m[${workerId}] Worker spawned\x1b[0m — PID ${pid} — task: ${taskId}`,
  SPAWNED_RUNTIME: (prefix: string, pid: number) => `  ┌─ \x1b[32m${prefix} Harness spawned\x1b[0m — PID ${pid}`,
} as const;
