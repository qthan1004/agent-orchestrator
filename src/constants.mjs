export const TOOL_NAMES = {
  HELLO_WORLD: "hello_world",
  REGISTER_WORKER: "register_worker",
  GET_STATUS: "get_status",
  GET_NEXT_TASK: "get_next_task",
  COMPLETE_TASK: "complete_task",
  REPORT_PROGRESS: "report_progress",
  GET_QUEUE_STATUS: "get_queue_status",
  GET_CHECKPOINT: "get_checkpoint",
  GET_PLAN_FOR_DECOMPOSITION: "get_plan_for_decomposition",
  SUBMIT_DECOMPOSITION: "submit_decomposition",
  REQUEST_RETRY: "request_retry"
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
  OFFLINE: 'offline'
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
  PLAN: 'plan'
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
  TASKS_STORED: 'TASKS_STORED',
  TASK_ACTIVATED: 'TASK_ACTIVATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_REQUEUED: 'TASK_REQUEUED',
  STATE_RESTORED: 'STATE_RESTORED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  PROGRESS: 'PROGRESS',
  CHECKPOINT_SAVED: 'CHECKPOINT_SAVED'
};
