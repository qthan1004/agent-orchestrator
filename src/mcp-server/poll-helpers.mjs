/**
 * Long poll: chờ task available hoặc timeout.
 * Nếu pollTimeoutMs = 0 → instant mode (fallback).
 */
export function waitForTask(queue, { timeoutMs = 30000, checkIntervalMs = 2000 } = {}) {
  // Instant mode
  if (timeoutMs === 0) {
    return Promise.resolve(queue.getNextTask());
  }
  
  // Long poll
  return new Promise((resolve) => {
    // Check ngay lần đầu
    const immediate = queue.getNextTask();
    if (immediate) return resolve(immediate);
    
    const start = Date.now();
    const timer = setInterval(() => {
      const task = queue.getNextTask();
      if (task) {
        clearInterval(timer);
        return resolve(task);
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        return resolve(null);
      }
    }, checkIntervalMs);
  });
}

/**
 * Long poll: chờ plan available hoặc timeout.
 */
export function waitForPlan(stateManager, { timeoutMs = 60000, checkIntervalMs = 5000 } = {}) {
  if (timeoutMs === 0) {
    return Promise.resolve(stateManager.checkPlans());
  }
  
  return new Promise((resolve) => {
    const immediate = stateManager.checkPlans();
    if (immediate.status !== 'idle') return resolve(immediate);
    
    const start = Date.now();
    const timer = setInterval(() => {
      const result = stateManager.checkPlans();
      if (result.status !== 'idle') {
        clearInterval(timer);
        return resolve(result);
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        return resolve(result); // still idle
      }
    }, checkIntervalMs);
  });
}
