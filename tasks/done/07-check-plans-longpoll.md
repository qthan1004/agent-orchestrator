# Task 07: check_plans — Long Poll + IDLE/DECOMPOSE directive

## Info
- **ID:** 07-check-plans-longpoll
- **Module:** mcp-server/tools
- **Group:** 3 (Long Polling)
- **Dependencies:** 04, 05
- **Priority:** 2

## What to do

Refactor tool `check_plans` trong `src/mcp-server/tools.mjs`:
1. Dùng Long Polling (waitForPlan) - timeout 60s
2. Trả directive format

### Refactored handler
```js
import { waitForPlan } from './poll-helpers.mjs';

async () => {
  const { planPollTimeoutMs, checkIntervalMs } = context.config.polling;
  const result = await waitForPlan(stateManager, {
    timeoutMs: planPollTimeoutMs,
    checkIntervalMs: checkIntervalMs * 2  // plan check ít thường xuyên hơn
  });
  
  if (result.status === 'idle') {
    return { content: [{ type: "text", text: JSON.stringify({ action: AGENT_ACTION.IDLE }) }] };
  }
  
  if (result.status === 'busy') {
    return { content: [{ type: "text", text: JSON.stringify({ 
      action: AGENT_ACTION.WAIT, 
      current: result.current 
    }) }] };
  }
  
  // ready
  return { content: [{ type: "text", text: JSON.stringify({
    action: AGENT_ACTION.DECOMPOSE,
    plan_path: result.plan_path,
    content: result.content,
    pending_count: result.pending_count
  }) }] };
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Start server → gọi `check_plans` khi không có plan → chờ ~60s → trả `{ action: "IDLE" }`
- Drop file vào `plan/pending/` → gọi `check_plans` → trả `{ action: "DECOMPOSE", content: "..." }`

## Done Criteria
- [x] Long Poll 60s cho plans
- [x] Directive format: IDLE/WAIT/DECOMPOSE
- [x] Plan content inline trong response
