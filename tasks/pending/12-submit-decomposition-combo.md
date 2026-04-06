# Task 12: submit_decomposition — Combo next plan status

## Info
- **ID:** 12-submit-decomposition-combo
- **Module:** mcp-server/tools
- **Group:** 6
- **Dependencies:** 04, 07
- **Priority:** 2

## What to do

Refactor tool `submit_decomposition` — sau khi submit thành công, trả luôn next plan status + chuyển role về WORKER.

### Refactored response (success case)
```js
async ({ tasks, graph, reasoning, source_plan }) => {
  try {
    stateManager.storeTasks(tasks, graph);
    stateManager.completePlan(source_plan);
    
    // Chuyển planner → worker (nếu worker_id available, cần thêm vào input)
    // Hoặc clear planner role ở đây
    
    // Check next plan status
    const planStatus = stateManager.checkPlansQuick();
    let nextAction;
    
    if (planStatus.hasPending) {
      // Có plan khác cần decompose
      const nextPlan = stateManager.checkPlans(); // move pending → processing
      nextAction = {
        action: AGENT_ACTION.DECOMPOSE,
        plan_path: nextPlan.plan_path,
        content: nextPlan.content,
        pending_count: nextPlan.pending_count
      };
    } else {
      // Hết plan → chuyển sang worker mode
      nextAction = { action: AGENT_ACTION.IDLE };
      // Clear planner role cho worker_id (nếu có)
    }
    
    return {
      content: [{ type: "text", text: JSON.stringify({
        accepted: true,
        plan_completed: source_plan,
        tasks_created: tasks.length,
        next_plan: nextAction
      }) }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({
        accepted: false,
        errors: [err.message]
      }) }]
    };
  }
}
```

### Cân nhắc: Thêm worker_id vào input schema
Hiện tại `submit_decomposition` không yêu cầu `worker_id`. Cần thêm (optional) để server biết planner nào submit → chuyển role.

```js
inputSchema: {
  tasks: ...,
  graph: ...,
  reasoning: ...,
  source_plan: ...,
  worker_id: z.string().optional().describe("Planner worker UUID for role transition")
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Submit decomposition → response có `next_plan` field
- Nếu có thêm plan pending → next_plan có content
- Nếu hết plan → next_plan = IDLE

## Done Criteria
- [ ] Response có `next_plan` với action directive
- [ ] Chuyển role planner → worker sau submit (nếu hết plan)
- [ ] Multiple plans: auto chain decomposition
- [ ] Error case giữ nguyên behavior
