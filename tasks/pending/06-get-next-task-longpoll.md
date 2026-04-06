# Task 06: get_next_task — Long Poll + IDLE/EXECUTE directive

## Info
- **ID:** 06-get-next-task-longpoll
- **Module:** mcp-server/tools
- **Group:** 3 (Long Polling)
- **Dependencies:** 03, 04, 05
- **Priority:** 1

## What to do

Refactor tool `get_next_task` trong `src/mcp-server/tools.mjs` để:
1. Dùng Long Polling (waitForTask) thay vì instant return
2. Trả directive format (EXECUTE/IDLE/BECOME_PLANNER)
3. Import `resolveIdleAction` (task 09 — nếu chưa có, tạm return IDLE)

### Refactored handler

```js
import { waitForTask } from './poll-helpers.mjs';
import { AGENT_ACTION } from '../constants.mjs';

async ({ worker_id }) => {
  const worker = workerRegistry.getWorker(worker_id);
  if (!worker) throw new Error("Invalid worker_id");
  
  workerRegistry.updateHeartbeat(worker_id);  // auto-heartbeat
  
  // Long poll
  const { pollTimeoutMs, checkIntervalMs } = context.config.polling;
  const task = await waitForTask(stateManager.queue, { 
    timeoutMs: pollTimeoutMs, 
    checkIntervalMs 
  });
  
  if (!task) {
    // No task → check if should become planner (task 09 sẽ implement đầy đủ)
    return {
      content: [{ type: "text", text: JSON.stringify({ action: AGENT_ACTION.IDLE }) }]
    };
  }
  
  // Có task → assign
  stateManager.moveToActive(task.id);
  worker.current_task = task.id;
  workerRegistry.setRole(worker_id, WORKER_ROLE.WORKER);
  
  if (logger) logger.log(STATE_EVENTS.TASK_ASSIGNED, { task_id: task.id, worker_id });
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        action: AGENT_ACTION.EXECUTE,
        task_id: task.id,
        task_details: task,
        context: {
          group_id: findGroupForTask(task.id),
          total_remaining: stateManager.queue.getStatus().pending
        }
      })
    }]
  };
}
```

### Helper: findGroupForTask
```js
function findGroupForTask(taskId) {
  for (const group of stateManager.queue.groups) {
    if (group.tasks.includes(taskId)) return group.group_id;
  }
  return null;
}
```

### Lưu ý
- `context.config` phải có `polling` field (từ task 02)
- IDLE response phải tối giản — agent không cần reasoning

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Start server → gọi `get_next_task` khi queue trống → phải chờ ~30s rồi trả `{ action: "IDLE" }`
- Thêm task vào queue → gọi `get_next_task` → phải trả `{ action: "EXECUTE", task_id: "..." }`

## Done Criteria
- [ ] Long Poll hoạt động (chờ 30s khi trống)
- [ ] Directive format: `action` field thay vì `task_id: null`
- [ ] Task details inline trong response
- [ ] Auto-heartbeat trên mỗi call
- [ ] Backward compatibility: response vẫn có `task_id` field
