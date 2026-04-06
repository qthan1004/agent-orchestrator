# Task 09: resolveIdleAction — BECOME_PLANNER logic

## Info
- **ID:** 09-resolve-idle-action
- **Module:** mcp-server
- **Group:** 5 (Combo + Re-election)
- **Dependencies:** 03, 04
- **Priority:** 1

## What to do

Tạo helper function `resolveIdleAction` — quyết định agent nên IDLE hay BECOME_PLANNER khi không có task.

### File mới: `src/mcp-server/idle-resolver.mjs`

```js
import { AGENT_ACTION, WORKER_ROLE } from '../constants.mjs';

/**
 * Khi worker không có next task, quyết định action:
 * - BECOME_PLANNER nếu có plan pending + không có active planner
 * - IDLE nếu không có gì
 */
export function resolveIdleAction({ stateManager, workerRegistry, workerId, config }) {
  const planStatus = stateManager.checkPlansQuick();
  
  if (planStatus.hasPending || planStatus.hasProcessing) {
    const activePlanner = workerRegistry.getActivePlanner(config.recovery.staleThresholdMs);
    
    if (!activePlanner) {
      // Promote worker → planner
      workerRegistry.setRole(workerId, WORKER_ROLE.PLANNER);
      
      // Get plan content
      let planData;
      if (planStatus.hasProcessing) {
        planData = stateManager.getProcessingPlan();
      } else {
        planData = stateManager.checkPlans(); // moves pending → processing
      }
      
      return {
        action: AGENT_ACTION.BECOME_PLANNER,
        plan_path: planData?.plan_path || null,
        content: planData?.content || null,
        pending_count: planStatus.pendingCount
      };
    }
  }
  
  return { action: AGENT_ACTION.IDLE };
}
```

### Usage (sẽ dùng trong task 06 update và task 10):
```js
import { resolveIdleAction } from './idle-resolver.mjs';

// Trong get_next_task khi task = null:
const idleResult = resolveIdleAction({ stateManager, workerRegistry, workerId: worker_id, config });
return { content: [{ type: "text", text: JSON.stringify(idleResult) }] };
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/mcp-server/idle-resolver.mjs` |

## Verification
```bash
# Test 1: No plans → IDLE
# Test 2: Plan pending + no planner → BECOME_PLANNER
# Test 3: Plan pending + active planner → IDLE
```

## Done Criteria
- [ ] Trả BECOME_PLANNER khi plan pending + no planner
- [ ] Trả IDLE khi không có plan hoặc planner đã tồn tại
- [ ] Promote worker bằng setRole()
- [ ] Plan content inline nếu BECOME_PLANNER
