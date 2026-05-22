export const SCHEDULER_DECISION = {
  DISPATCH: 'dispatch',
  WAIT: 'wait',
  BLOCK: 'block',
} as const;

export const SCHEDULER_WAIT_REASON = {
  NO_TASKS: 'no_tasks',
  CAPACITY_FULL: 'capacity_full',
  BACKEND_UNAVAILABLE: 'backend_unavailable',
  DEPENDENCIES_PENDING: 'dependencies_pending',
} as const;

export const DISPATCH_LOOP_DEFAULTS = {
  MAX_RESPAWNS: 3,
  LOOP_SLEEP_MS: 2_000,
  OLLAMA_UNAVAILABLE_LOG_INTERVAL_MS: 10_000,
  DEFAULT_POINTS_REQUIRED: 1,
} as const;

export const DISPATCH_LOOP_TEXT = {
  ACTIVE_TASK_PATH_ESCAPES: (path: string) => `Active task path escapes workspace root: ${path}`,
  DISPATCHING: (taskId: string) => `[DispatchLoop] Dispatching task ${taskId}: moving inbox -> active.`,
  MAX_RESPAWNS_SUMMARY: (maxRespawns: number) => `Task exceeded max respawns (${maxRespawns}). Consider using a cloud model.`,
  MAX_RESPAWNS_BLOCKED_REASON: 'max_respawns_exceeded',
  MAX_RESPAWNS_MARKED: (taskId: string, maxRespawns: number) => `[DispatchLoop] Task ${taskId} exceeded max respawns (${maxRespawns}); marked blocked.`,
  SELECTED_MODEL: (model: string, mode: string, taskId: string) => `[DispatchLoop] Selected model ${model} (${mode}) for task ${taskId}.`,
  INJECTED_HANDOVER: (taskId: string, respawnCount: number) => `[DispatchLoop] Injected handover for task ${taskId} (respawn ${respawnCount}).`,
  MONITORING_HARNESS: (workerId: string, taskId: string) => `[DispatchLoop] Monitoring harness ${workerId} for task ${taskId}.`,
  ACCEPTED_BUT_EXITED: (workerId: string, exitDetail: string, taskId: string) => `[DispatchLoop] Harness ${workerId} ended with ${exitDetail} after accepted completion for task ${taskId}.`,
  EXIT_DETAIL_TIMEOUT: 'timeout',
  EXIT_DETAIL_CODE: (code: number | null) => `code ${code}`,
  MISSING_COMPLETION: (workerId: string, taskId: string) => `[DispatchLoop] Worker ${workerId} exited without accepted completion callback. Requeuing task ${taskId}.`,
  MISSING_COMPLETION_REASON: 'missing accepted harness completion signal',
  RETRY_FAILED_SUMMARY: (retryCount: number, reason: string) => `Harness attempt failed after ${retryCount} retries: ${reason}`,
  MAX_RETRIES_MARKED: (taskId: string, maxRetries: number) => `[DispatchLoop] Task ${taskId} reached max retries (${maxRetries}); marked failed.`,
  REQUEUED_AFTER_FAILURE: (taskId: string, retryCount: number, maxRetries: number) => `[DispatchLoop] Requeued task ${taskId} after harness failure (${retryCount}/${maxRetries}).`,
  OLLAMA_UNAVAILABLE: '[DispatchLoop] Ollama unavailable; waiting before dispatch.',
} as const;
