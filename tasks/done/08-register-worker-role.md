# Task 08: register_worker — Gộp role + queue summary

## Info
- **ID:** 08-register-worker-role
- **Module:** mcp-server/tools
- **Group:** 4 (Combo Tools)
- **Dependencies:** 03, 06
- **Priority:** 1

## What to do

Refactor tool `register_worker` để trả luôn role suggestion + queue summary. Single planner enforcement.

### Refactored handler
```js
async () => {
  const worker = workerRegistry.register();
  const status = stateManager.getStatus();
  const planStatus = stateManager.checkPlansQuick();
  const { staleThresholdMs } = context.config.recovery;
  
  // Determine role — SINGLE PLANNER enforced
  let role = WORKER_ROLE.WORKER;
  
  if (status.pending === 0 && status.active === 0) {
    // No tasks in queue
    if (planStatus.hasPending || planStatus.hasProcessing) {
      // Plans available → need planner?
      const activePlanner = workerRegistry.getActivePlanner(staleThresholdMs);
      if (!activePlanner) {
        role = WORKER_ROLE.PLANNER;
      } else {
        role = WORKER_ROLE.IDLE; // planner exists, no tasks
      }
    } else {
      role = WORKER_ROLE.IDLE; // nothing to do
    }
  }
  // else: tasks available → WORKER (default)
  
  workerRegistry.setRole(worker.id, role);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        worker_id: worker.id,
        role: role,
        queue_summary: status,
        has_pending_plans: planStatus.hasPending || planStatus.hasProcessing
      })
    }]
  };
}
```

### Lưu ý
- **Chỉ 1 PLANNER** tại mọi thời điểm — `getActivePlanner()` check heartbeat
- Agent nhận `role` → follow directive, không tự quyết role
- Nếu `IDLE` → agent vào idle loop (Long Poll `get_next_task` hoặc `check_plans`)

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Register khi queue trống + có plan → nhận role `PLANNER`
- Register lần 2 (planner đã tồn tại) → nhận role `WORKER` hoặc `IDLE`
- Register khi có tasks → nhận role `WORKER`

## Done Criteria
- [x] Response có `role` field
- [x] Single planner enforced
- [x] Queue summary inline
- [x] `has_pending_plans` flag
