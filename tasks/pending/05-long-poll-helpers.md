# Task 05: waitForTask / waitForPlan helpers — Long Polling logic

## Info
- **ID:** 05-long-poll-helpers
- **Module:** mcp-server
- **Group:** 3 (Long Polling)
- **Dependencies:** 02
- **Priority:** 1

## What to do

Tạo file mới `src/mcp-server/poll-helpers.mjs` chứa Long Polling helpers.

### 1. waitForTask
```js
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
```

### 2. waitForPlan
```js
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
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/mcp-server/poll-helpers.mjs` |

## Verification
```bash
node -e "
import { waitForTask } from './src/mcp-server/poll-helpers.mjs';
import { TaskQueue } from './src/mcp-server/task-queue.mjs';
const q = new TaskQueue();

// Test instant mode (timeout=0)
const r1 = await waitForTask(q, { timeoutMs: 0 });
console.log('instant empty:', r1);  // null

// Test timeout (2s)
const start = Date.now();
const r2 = await waitForTask(q, { timeoutMs: 2000, checkIntervalMs: 500 });
console.log('timeout:', Date.now() - start, 'ms, result:', r2);  // ~2000ms, null
"
```

## Done Criteria
- [ ] `waitForTask` instant mode trả ngay khi `timeoutMs=0`
- [ ] `waitForTask` chờ đúng timeout khi queue trống
- [ ] `waitForTask` trả task ngay khi available (trước timeout)
- [ ] `waitForPlan` logic tương tự
- [ ] Không block event loop (dùng setInterval, không while-loop)
