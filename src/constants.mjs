export const TOOL_NAMES = {
  HELLO_WORLD: "hello_world",
  REGISTER_WORKER: "register_worker",
  GET_STATUS: "get_status"
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
