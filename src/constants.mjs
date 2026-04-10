export const VERSION = '0.2.0';

export const TOOL_NAMES = {
  HELLO_WORLD: "hello_world",
  REGISTER_WORKER: "register_worker",
  GET_STATUS: "get_status",
  GET_NEXT_TASK: "get_next_task",
  COMPLETE_TASK: "complete_task",
  REPORT_PROGRESS: "report_progress",
  GET_QUEUE_STATUS: "get_queue_status",
  GET_CHECKPOINT: "get_checkpoint",
  CHECK_PLANS: "check_plans",
  SUBMIT_DECOMPOSITION: "submit_decomposition",
  REQUEST_RETRY: "request_retry",
  FORCE_RELEASE_TASK: "force_release_task",
  GET_TEMPLATE: "get_template",
  PING: "ping"
};

/**
 * Các loại tín hiệu cơ bản từ OS.
 */
export const PROCESS_SIGNALS = {
  /** Signal Interrupt: Gửi khi người dùng bấm Ctrl+C trong terminal để ngắt chương trình. */
  INTERRUPT: 'SIGINT',
  /** Signal Terminate: Gửi bởi OS (như systemd, Docker) yêu cầu dừng chương trình an toàn. */
  TERMINATE: 'SIGTERM'
};

/**
 * Danh sách tín hiệu kích hoạt tính năng Graceful Shutdown
 */
export const SHUTDOWN_SIGNALS = [PROCESS_SIGNALS.INTERRUPT, PROCESS_SIGNALS.TERMINATE];

export const WORKER_STATUS = {
  IDLE: 'idle',
  BUSY: 'busy',
  OFFLINE: 'offline',
  DISCONNECTED: 'disconnected'
};

export const API_ROUTES = {
  MCP: '/mcp',
  HEALTH: '/health'
};

export const DIR_NAMES = {
  EXCHANGE: 'exchange',
  INBOX: 'inbox',
  ACTIVE: 'active',
  OUTBOX: 'outbox',
  CHECKPOINTS: 'checkpoints',
  LOGS: 'logs',
  TEMPLATES: 'templates',
  PLAN: 'plan',
  TASKS: 'tasks',
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done'
};

export const TASK_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

export const FILE_PREFIXES = {
  TASK: 'task-',
  RESULT: 'result-',
  QUEUE: '_queue.json'
};

export const STATE_EVENTS = {
  PLAN_LOADED: 'PLAN_LOADED',
  PLAN_DETECTED: 'PLAN_DETECTED',
  PLAN_PROCESSING: 'PLAN_PROCESSING',
  PLAN_COMPLETED: 'PLAN_COMPLETED',
  TASKS_STORED: 'TASKS_STORED',
  TASK_ACTIVATED: 'TASK_ACTIVATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_REQUEUED: 'TASK_REQUEUED',
  TASK_PERMANENTLY_FAILED: 'TASK_PERMANENTLY_FAILED',
  STATE_RESTORED: 'STATE_RESTORED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  PROGRESS: 'PROGRESS',
  CHECKPOINT_SAVED: 'CHECKPOINT_SAVED'
};

export const RECOVERY_EVENTS = {
  SERVER_START: 'SERVER_START',
  SERVER_SHUTDOWN: 'SERVER_SHUTDOWN',
  MONITORING_STARTED: 'MONITORING_STARTED',
  MONITORING_STOPPED: 'MONITORING_STOPPED',
  STALE_WORKER_DETECTED: 'STALE_WORKER_DETECTED',
  ORPHAN_DETECTED: 'ORPHAN_DETECTED',
  ORPHAN_REQUEUED: 'ORPHAN_REQUEUED',
  CLEAN_SHUTDOWN_MARKED: 'CLEAN_SHUTDOWN_MARKED',
  UNCLEAN_SHUTDOWN_DETECTED: 'UNCLEAN_SHUTDOWN_DETECTED',
  RECOVERY_STARTED: 'RECOVERY_STARTED',
  RECOVERY_COMPLETED: 'RECOVERY_COMPLETED',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED'
};

export const RECOVERY_DEFAULTS = {
  MONITOR_INTERVAL_MS: 5_000,     // 5s (check every 5s)
  STALE_WORKER_THRESHOLD_MS: 90_000,   // 90s — worker task stuck detection
  PLANNER_ALIVE_THRESHOLD_MS: 90_000,  // 90s — planner heartbeat check (ping every 30-40s)
  MAX_RETRIES: 3,
  MAX_TASK_RETRIES: 3             // Task-level: permanently fail after 3 explicit FAILED/BLOCKED
};

export const SHUTDOWN_MARKER_FILE = '.shutdown_clean';

export const WORKER_ROLE = {
  PLANNER: 'PLANNER',
  WORKER: 'WORKER',
  IDLE: 'IDLE'
};

export const AGENT_ACTION = {
  EXECUTE: 'EXECUTE',           // Có task → agent execute
  IDLE: 'IDLE',                 // Không có gì → agent idle
  BECOME_PLANNER: 'BECOME_PLANNER',  // Có plan mới → promote to planner
  DECOMPOSE: 'DECOMPOSE',      // Plan sẵn sàng → decompose
  WAIT: 'WAIT'                  // Đang bận → chờ
};

export const POLL_DEFAULTS = {
  POLL_TIMEOUT_MS: 30_000,      // Long poll default 30s
  CHECK_INTERVAL_MS: 2_000,     // Internal check every 2s
  PLAN_POLL_TIMEOUT_MS: 60_000  // Plan poll default 60s
};
