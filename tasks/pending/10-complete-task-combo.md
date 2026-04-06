# Task 10: complete_task — Combo auto_pickup + re-election

## Info
- **ID:** 10-complete-task-combo
- **Module:** mcp-server/tools
- **Group:** 5 (Combo + Re-election)
- **Dependencies:** 06, 09
- **Priority:** 1

## What to do

Refactor tool `complete_task` để auto pickup next task hoặc trigger planner re-election.

### Thêm `auto_pickup` input parameter
```js
inputSchema: {
  task_id: z.string(),
  status: z.enum([TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.FAILED]),
  summary: z.string(),
  worker_id: z.string(),
  auto_pickup: z.boolean().optional().default(true).describe("Auto-pickup next task")
}
```

### Refactored handler
```js
async ({ task_id, status, summary, worker_id, auto_pickup = true }) => {
  // ... existing validation + moveToOutbox logic (giữ nguyên) ...
  
  workerRegistry.updateHeartbeat(worker_id);  // auto-heartbeat
  stateManager.saveCheckpoint();
  
  // Auto pickup next task?
  if (auto_pickup && status === TASK_STATUS.DONE) {
    const nextTask = stateManager.queue.getNextTask();
    
    if (nextTask) {
      // Có task kế tiếp → assign ngay
      stateManager.moveToActive(nextTask.id);
      worker.current_task = nextTask.id;
      
      return { content: [{ type: "text", text: JSON.stringify({
        accepted: true,
        completed: task_id,
        next_task: {
          action: AGENT_ACTION.EXECUTE,
          task_id: nextTask.id,
          task_details: nextTask
        }
      }) }] };
    }
    
    // Hết task → check planner re-election
    const idleResult = resolveIdleAction({ 
      stateManager, workerRegistry, workerId: worker_id, config: context.config 
    });
    
    return { content: [{ type: "text", text: JSON.stringify({
      accepted: true,
      completed: task_id,
      next_task: idleResult  // IDLE hoặc BECOME_PLANNER
    }) }] };
  }
  
  // FAILED/BLOCKED hoặc auto_pickup=false → không auto pickup
  return { content: [{ type: "text", text: JSON.stringify({
    accepted: true,
    completed: task_id,
    next_task: { action: AGENT_ACTION.IDLE }
  }) }] };
}
```

### Lưu ý
- `auto_pickup=true` default → agent không cần specify
- FAILED/BLOCKED → KHÔNG auto pickup (agent có thể muốn xử lý)
- Re-election check chỉ khi hết task

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Complete task khi còn next → response chứa `next_task.action: "EXECUTE"`
- Complete task khi hết task → response chứa `next_task.action: "IDLE"` hoặc `"BECOME_PLANNER"`
- Complete task FAILED → response chứa `next_task.action: "IDLE"` (không auto pickup)

## Done Criteria
- [ ] `auto_pickup` parameter, default true
- [ ] Next task inline khi available
- [ ] BECOME_PLANNER khi plan pending + no planner
- [ ] IDLE khi thực sự trống
- [ ] FAILED/BLOCKED không auto pickup
