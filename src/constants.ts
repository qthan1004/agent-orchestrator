import os from 'os';
import { join } from 'path';

export const VERSION = "0.2.0" as const;
export type VersionValue = typeof VERSION;

export const RUNTIME_DIR_NAME = ".orchestrator" as const;
export const WORKSPACE_DIR_NAME = "workspaces" as const;
export const DEFAULT_RUNTIME_PATH = join(os.homedir(), RUNTIME_DIR_NAME);

export const TOOL_NAMES = {
  HELLO_WORLD: "hello_world",
  REGISTER_WORKSPACE: "register_workspace",
  REGISTER_PLANNER: "register_planner",
  REGISTER_WORKER: "register_worker",
  CREATE_PLAN: "create_plan",
  CREATE_TASKS: "create_tasks",
  PLANNER_TASK_READY: "planner_task_ready",
  GET_STATUS: "get_status",
  COMPLETE_TASK: "complete_task",
  REPORT_PROGRESS: "report_progress",
  GET_QUEUE_STATUS: "get_queue_status",
  SUBMIT_TASK: "submit_task",
  GET_CHECKPOINT: "get_checkpoint",
  SUBMIT_DECOMPOSITION: "submit_decomposition",
  REQUEST_RETRY: "request_retry",
  FORCE_RELEASE_TASK: "force_release_task",
  GET_TEMPLATE: "get_template",
  PING: "ping",
  SCAN_WORKSPACE: "scan_workspace",
  SESSION_CHECKPOINT: "session_checkpoint",
  CLOSE_WORKSPACE: "close_workspace",
  REOPEN_WORKSPACE: "reopen_workspace",
} as const;
export type ToolNameValue = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export const SESSION_STATUS = {
  SAVED: "saved",
  LOADED: "loaded",
  NO_SESSION: "no_session",
  CLEARED: "cleared",
} as const;
export type SessionStatusValue = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const SESSION_ACTION = {
  SAVE: "save",
  LOAD: "load",
  CLEAR: "clear",
} as const;
export type SessionActionValue = (typeof SESSION_ACTION)[keyof typeof SESSION_ACTION];

/**
 * Các loại tín hiệu cơ bản từ OS.
 */
export const PROCESS_SIGNALS = {
  /** Signal Interrupt: Gửi khi người dùng bấm Ctrl+C trong terminal để ngắt chương trình. */
  INTERRUPT: "SIGINT",
  /** Signal Terminate: Gửi bởi OS (như systemd, Docker) yêu cầu dừng chương trình an toàn. */
  TERMINATE: "SIGTERM",
} as const;

export type ProcessSignalValue =
  (typeof PROCESS_SIGNALS)[keyof typeof PROCESS_SIGNALS];

/**
 * Danh sách tín hiệu kích hoạt tính năng Graceful Shutdown
 */
export const SHUTDOWN_SIGNALS = [
  PROCESS_SIGNALS.INTERRUPT,
  PROCESS_SIGNALS.TERMINATE,
] as const;

export type ShutdownSignalValue = (typeof SHUTDOWN_SIGNALS)[number];

export const WORKER_STATUS = {
  IDLE: "idle",
  BUSY: "busy",
  OFFLINE: "offline",
  DISCONNECTED: "disconnected",
} as const;

export type WorkerStatusValue =
  (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS];

export const API_ROUTES = {
  MCP: "/mcp",
  HEALTH: "/health",
} as const;
export type ApiRouteValue = (typeof API_ROUTES)[keyof typeof API_ROUTES];

export const DIR_NAMES = {
  EXCHANGE: "exchange",
  INBOX: "inbox",
  ACTIVE: "active",
  OUTBOX: "outbox",
  CHECKPOINTS: "checkpoints",
  LOGS: "logs",
  SIGNALS: "signals",
  TEMPLATES: "templates",
  PLAN: "plan",
  PLANS: "plans",
  PLANNER: "planner",
  TASKS: "tasks",
  REGISTRY: "registry",
  SKILLS: "skills",
  CONTEXT: "context",
  RESULTS: "results",
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
} as const;

export type DirNameValue = (typeof DIR_NAMES)[keyof typeof DIR_NAMES];

export const TASK_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  DONE: "done",
  FAILED: "failed",
  BLOCKED: "blocked",
} as const;

export type TaskStatusValue = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const FILE_PREFIXES = {
  TASK: "task-",
  RESULT: "result-",
  QUEUE: "_queue.json",
} as const;
export type FilePrefixValue =
  (typeof FILE_PREFIXES)[keyof typeof FILE_PREFIXES];

export const STATE_EVENTS = {
  PLAN_LOADED: "PLAN_LOADED",
  PLAN_DETECTED: "PLAN_DETECTED",
  PLAN_PROCESSING: "PLAN_PROCESSING",
  PLAN_COMPLETED: "PLAN_COMPLETED",
  TASKS_STORED: "TASKS_STORED",
  TASK_ACTIVATED: "TASK_ACTIVATED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_REQUEUED: "TASK_REQUEUED",
  TASK_PERMANENTLY_FAILED: "TASK_PERMANENTLY_FAILED",
  STATE_RESTORED: "STATE_RESTORED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  PROGRESS: "PROGRESS",
  CHECKPOINT_SAVED: "CHECKPOINT_SAVED",
} as const;
export type StateEventValue = (typeof STATE_EVENTS)[keyof typeof STATE_EVENTS];

export const RECOVERY_EVENTS = {
  SERVER_START: "SERVER_START",
  SERVER_SHUTDOWN: "SERVER_SHUTDOWN",
  MONITORING_STARTED: "MONITORING_STARTED",
  MONITORING_STOPPED: "MONITORING_STOPPED",
  STALE_WORKER_DETECTED: "STALE_WORKER_DETECTED",
  ORPHAN_DETECTED: "ORPHAN_DETECTED",
  ORPHAN_REQUEUED: "ORPHAN_REQUEUED",
  CLEAN_SHUTDOWN_MARKED: "CLEAN_SHUTDOWN_MARKED",
  UNCLEAN_SHUTDOWN_DETECTED: "UNCLEAN_SHUTDOWN_DETECTED",
  RECOVERY_STARTED: "RECOVERY_STARTED",
  RECOVERY_COMPLETED: "RECOVERY_COMPLETED",
  MAX_RETRIES_EXCEEDED: "MAX_RETRIES_EXCEEDED",
} as const;
export type RecoveryEventValue =
  (typeof RECOVERY_EVENTS)[keyof typeof RECOVERY_EVENTS];

export const SERVER_PROFILES = {
  HYBRID: {
    staleThresholdMs: 15_000,         // 15 seconds
    autoKillWorker: true,
    workerType: 'LOCAL_LLM' as const,
    maxConcurrentWorkers: 1,          // 1 for 9B, 2 for 4B
    roleManagement: 'strict' as const,
  }
} as const;

export const RECOVERY_DEFAULTS = {
  MONITOR_INTERVAL_MS: 5_000, // 5s (check every 5s)
  STALE_WORKER_THRESHOLD_MS: 90_000, // 90s — worker task stuck detection
  PLANNER_ALIVE_THRESHOLD_MS: 90_000, // 90s — planner heartbeat check (ping every 30-40s)
  MAX_RETRIES: 3,
  MAX_TASK_RETRIES: 3, // Task-level: permanently fail after 3 explicit FAILED/BLOCKED
} as const;
export type RecoveryDefaultValue =
  (typeof RECOVERY_DEFAULTS)[keyof typeof RECOVERY_DEFAULTS];

export const SHUTDOWN_MARKER_FILE = ".shutdown_clean" as const;
export type ShutdownMarkerFileValue = typeof SHUTDOWN_MARKER_FILE;

export const WORKER_ROLE = {
  PLANNER: "PLANNER",
  WORKER: "WORKER",
  IDLE: "IDLE",
} as const;
export type WorkerRoleValue = (typeof WORKER_ROLE)[keyof typeof WORKER_ROLE];

export const AGENT_ACTION = {
  EXECUTE: "EXECUTE", // Có task → agent execute
  IDLE: "IDLE", // Không có gì → agent idle
  DECOMPOSE: "DECOMPOSE", // Plan sẵn sàng → decompose
  WAIT: "WAIT", // Đang bận → chờ
} as const;
export type AgentActionValue = (typeof AGENT_ACTION)[keyof typeof AGENT_ACTION];

export const POLL_DEFAULTS = {
  POLL_TIMEOUT_MS: 30_000, // Long poll default 30s
  CHECK_INTERVAL_MS: 2_000, // Internal check every 2s
  PLAN_POLL_TIMEOUT_MS: 60_000, // Plan poll default 60s
} as const;
export type PollDefaultValue =
  (typeof POLL_DEFAULTS)[keyof typeof POLL_DEFAULTS];

export const SERVER_RUNTIME_DEFAULTS = {
  ONE_SHOT_IDLE_MS: 2_000,
} as const;

export const SYSTEM_MESSAGE = {
  // Setup & Bootstrap
  BOOTSTRAP_FAILED: 'Failed to create directories:',
  BOOTSTRAP_CREATED: (created: number, skipped: number) => `Created ${created} missing directories (${skipped} already existed).`,
  BOOTSTRAP_CLEAN: 'All directories present.',
  WORKERS_CLEANED: (count: number) => `Cleaned ${count} disconnected worker(s) from previous session.`,
  HYBRID_ACTIVATED: 'Hybrid runtime activated: Dispatch loop and resource monitoring started.',
  JSON_PARSE_ERROR: (method: string, url: string) => `JSON parse error from ${method} ${url}:`,
  PRIMARY_WORKSPACE: (name: string, id: string) => `  Primary workspace: ${name} [${id}]`,
  WORKSPACE_PATH: (workspacePath: string) => `    Path: ${workspacePath}`,
  WORKSPACE_DIRS_CREATED: (created: number, skipped: number) => `    Created ${created} workspace directories (${skipped} existed).`,
  OLLAMA_NOT_AVAILABLE: '  ⚠ Ollama not available — dispatch loop will not spawn workers until Ollama is reachable.',
  RECOVERY_CLEAN: 'clean',
  RECOVERY_ORPHANS: (count: number) => `recovered ${count} orphans`,
  SHUTDOWN_RECEIVED: (signal: string) => `\nReceived ${signal}. Shutting down gracefully...`,
  RECOVERY_ORPHAN_RELEASED: 'Orphan task released from active/ to inbox without retry increment',
  RECOVERY_PROCESS_ALIVE_EVENT: 'STALE_WORKER_PROCESS_ALIVE',
  RECOVERY_PROCESS_ALIVE: (workerId: string) => `Worker ${workerId} missed registry heartbeat but process is still alive; refreshed heartbeat and skipped recovery`,
  RECOVERY_WORKER_STALE: (workerId: string, elapsedMs: number) => `Worker ${workerId} stale for ${Math.round(elapsedMs / 1000)}s`,
  RECOVERY_FAILED_OUTBOX_REQUEUE: (retryCount: number, maxRetries: number) => `Safety net: FAILED task found in outbox (retry ${retryCount}/${maxRetries}), requeuing to inbox`,
  RECOVERY_TASK_ALREADY_MOVED: (taskId: string) => `Task ${taskId} already moved from active/ (race with complete_task), skipping requeue`,
  RECOVERY_STALE_TASK_REQUEUED: (retryCount: number) => `Stale task requeued to inbox (attempt ${retryCount})`,
  RECOVERY_MONITORING_STARTED: (intervalMs: number) => `Recovery monitoring started (every ${intervalMs / 1000}s)`,
  RECOVERY_MONITORING_STOPPED: 'Recovery monitoring stopped',
  SETUP_BANNER: '\nMCP Orchestrator Setup',
  SETUP_INVALID_PROFILE: 'Invalid profile. Hybrid runtime is always enabled.',
  SETUP_CUSTOM_APPLIED: '\n  Custom config applied (session-only)\n',
  SETUP_DEFAULTS_APPLIED: '\n  Defaults applied\n',
  
  // Plan Watcher
  PLAN_WATCHER_POLLING: (seconds: number) => `  Plan watcher: polling every ${seconds}s`,
  PLAN_WATCHER_DETECTED: (filename: string, workspaceId: string) => `  Plan detected: ${filename} in workspace ${workspaceId} → moved to processing/`,
  PLAN_WATCHER_DETECTED_LEGACY: (filename: string) => `  Plan detected: ${filename} → moved to processing/ (Legacy mode)`,
  PLAN_WATCHER_ERROR: (errorMsg: string) => `  Plan watcher error: ${errorMsg}`,

  // Dispatch Loop
  DISPATCH_STARTING: '[DispatchLoop] Starting hybrid task dispatch loop...',
  DISPATCH_STOPPING: '[DispatchLoop] Stopping dispatch loop gracefully...',
  DISPATCH_WORKER_TIMEOUT: (workerId: string, taskId: string) => `[DispatchLoop] Worker ${workerId} timed out. Requeuing task ${taskId}.`,
  DISPATCH_WORKER_EXITED: (workerId: string, code: number | null, taskId: string) => `[DispatchLoop] Worker ${workerId} exited with code ${code}. Requeuing task ${taskId}.`,
  DISPATCH_WORKER_SUCCESS: (workerId: string, taskId: string) => `[DispatchLoop] Worker ${workerId} finished task ${taskId} successfully.`,
  DISPATCH_MODEL_UNLOADED: (model: string) => `[DispatchLoop] Unloaded model ${model} to free VRAM.`,
  DISPATCH_MODEL_UNLOAD_FAILED: (model: string, error: string) => `[DispatchLoop] Failed to unload model ${model}: ${error}`,
  DISPATCH_ERROR: (error: string) => `[DispatchLoop] Error in loop: ${error}`,

  // Worker completion API
  WORKER_COMPLETE_INVALID_PAYLOAD: 'Invalid worker completion payload',
  WORKER_COMPLETE_UNKNOWN_WORKER: (workerId: string) => `Unknown worker: ${workerId}`,
  WORKER_COMPLETE_NOT_ASSIGNED: (workerId: string, taskId: string) => `Worker ${workerId} is not assigned to task ${taskId}`,
  WORKER_COMPLETE_LEASE_MISMATCH: (workerId: string, taskId: string, runtimeId: string, leaseGeneration: number) =>
    `Worker ${workerId} callback for task ${taskId} does not match active runtime lease ${runtimeId} generation ${leaseGeneration}`,
  WORKER_COMPLETE_RECEIVED: (status: string, workerId: string, taskId: string, summary: string) => `[WorkerComplete] Received ${status} from ${workerId}/${taskId}: ${summary}`,
  WORKER_COMPLETE_NO_ACTIVE_HARNESS: (workerId: string, taskId: string) => `[WorkerComplete] Completion accepted for ${workerId}/${taskId}, but no active harness monitor was found.`,
  WORKER_COMPLETE_HANDOVER_REQUEUED: (taskId: string, respawnCount: number) => `[WorkerComplete] Task ${taskId} requeued with handover (respawn ${respawnCount}).`,
  WORKER_COMPLETE_STATUS_SUCCESS: 'success',
  WORKER_COMPLETE_STATUS_FAILURE: 'failure',

  // Server lifecycle
  SERVER_UNHANDLED_ERROR: 'Unhandled error:',
  SERVER_INTERNAL_ERROR: 'Internal server error',
  SERVER_BANNER_TOP: '┌───────────────────────────────────┐',
  SERVER_BANNER_LISTENING: (portStr: string) => `│  MCP Server listening :${portStr}       │`,
  SERVER_BANNER_TRANSPORT: '│  Transport: Streamable HTTP       │',
  SERVER_BANNER_ENDPOINT: (route: string) => `│  Endpoint: ${route.padEnd(23)}│`,
  SERVER_BANNER_HEALTH: (route: string) => `│  Health: ${route.padEnd(25)}│`,
  SERVER_BANNER_VERSION: (version: string) => `│  Version: ${version.padEnd(24)}│`,
  SERVER_BANNER_BOTTOM: '└───────────────────────────────────┘',
  SERVER_RECOVERY_STATUS: (status: string) => `  Recovery: ${status}`,
  SHUTDOWN_KILLING_WORKER: (workerId: string, pid: number) => `[Shutdown] Killing active worker ${workerId} (PID ${pid})...`,
  SHUTDOWN_UNLOADED_MODEL: (model: string) => `[Shutdown] Unloaded model ${model} from VRAM.`,
  SHUTDOWN_UNLOAD_FAILED: (error: string) => `[Shutdown] Failed to unload models: ${error}`,
  ONE_SHOT_ENABLED: (idleMs: number) => `[OneShot] Enabled. Server will exit after observed work drains for ${idleMs}ms.`,

  // VRAM Manager
  VRAM_UNLOADED: (model: string) => `[VRAM] Unloaded model: ${model}`,
  VRAM_UNLOAD_FAILED: (model: string) => `[VRAM] Failed to unload model ${model}:`,
  VRAM_OLLAMA_DOWN: '[WARNING] Ollama is not responding to health check.',
  VRAM_ALERT_HIGH: (percent: number, loaded: string) => `[ALERT] VRAM utilization is above 90%! (${percent.toFixed(1)}% used, models loaded: ${loaded})`,
  VRAM_CHECK_ERROR: '[VRAM Monitor] Error during health check:',

  // Process Manager
  PROCESS_STDOUT: (workerId: string, pid: number) => `[Worker ${workerId} / PID ${pid}] STDOUT:`,
  PROCESS_STDERR: (workerId: string, pid: number) => `[Worker ${workerId} / PID ${pid}] STDERR:`,
  PROCESS_ERROR: (workerId: string, pid: number) => `[Worker ${workerId} / PID ${pid}] Error:`,

  // Model Selector
  MODEL_WARNING_VRAM: (mode: string, required: number, free: number) => `[WARNING] Selected ${mode} profile requires ~${required}GB VRAM, but only ~${free.toFixed(1)}GB is free.`,
  MODEL_CHECK_ERROR: (error: string) => `[WARNING] Failed to check VRAM: ${error}`,

  // Agent Runner
  AGENT_NOTIFY_FAILED: 'Failed to notify server:',
  AGENT_PARSE_FAILED: 'Failed to parse stdin payload:',
  AGENT_TOKEN_CHECKPOINT: 'Token checkpoint reached (80%)',
  AGENT_ERROR: 'Agent runner error:',

  // Prompt Builder
  PROMPT_BASE_FAILED: (path: string, error: string) => `Failed to load base prompt from ${path}: ${error}`,
  PROMPT_SKILL_FAILED: (path: string, error: string) => `Failed to load skill prompt from ${path}: ${error}`,

  // File Backend & Others
  FILE_ENSURE_DIR_ERROR: (path: string) => `ensureDir error for ${path}:`,
  FILE_ATOMIC_WRITE_ERROR: (path: string) => `atomicWrite error for ${path}:`,
  FILE_READ_JSON_ERROR: (path: string) => `readJSON error for ${path}:`,
  FILE_READ_FILE_ERROR: (path: string) => `readFile error for ${path}:`,
  FILE_WRITE_JSON_ERROR: (path: string) => `writeJSON error for ${path}:`,
  FILE_MOVE_ERROR: (from: string, to: string) => `moveFile error from ${from} to ${to}:`,
  FILE_COPY_ERROR: (from: string, to: string) => `copyFile error from ${from} to ${to}:`,
  FILE_LIST_ERROR: (path: string) => `listFiles error for ${path}:`,
  FILE_DELETE_ERROR: (path: string) => `deleteFile error for ${path}:`,

  LOGGER_WRITE_ERROR: (event: string) => `Logger error writing event ${event}:`,
  RECOVERY_WRITE_MARKER: 'Failed to write shutdown marker:',
  RECOVERY_CLEAR_MARKER: 'Failed to clear shutdown marker:',
  SERVER_START_FAILED: 'Failed to start server:',
  SERVER_UNKNOWN_CMD: (cmd: string) => `Unknown command: ${cmd}`
} as const;
