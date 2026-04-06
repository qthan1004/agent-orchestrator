# Task 15: force_release_task — New MCP tool

## Info
- **ID:** 15-force-release-task
- **Module:** mcp-server/tools
- **Group:** 7 (Bug Fixes)
- **Dependencies:** 03, 14
- **Priority:** 2

## What to do

Tạo MCP tool mới `force_release_task` — manual intervention khi task bị lock.

### 1. Thêm tool name vào constants
```js
// src/constants.mjs
FORCE_RELEASE_TASK: "force_release_task"
```

### 2. Register tool trong tools.mjs
```js
server.registerTool(
  TOOL_NAMES.FORCE_RELEASE_TASK,
  {
    description: "Forcefully release a locked task from active/ back to inbox/. Use when worker crashed and task is stuck. Does NOT check ownership or retry limits.",
    inputSchema: {
      task_id: z.string().describe("Task ID to release"),
      reason: z.string().describe("Why you are forcing release")
    }
  },
  async ({ task_id, reason }) => {
    try {
      // Check task exists in active/
      const activePath = path.join(
        context.config.exchange.active, 
        `${FILE_PREFIXES.TASK}${task_id}.json`
      );
      
      if (!fs.existsSync(activePath)) {
        throw new Error(`Task ${task_id} not found in active/ directory`);
      }
      
      // Force move back to inbox
      stateManager.moveToInbox(task_id);
      
      // Clear worker assignment if any worker owns this task
      for (const worker of workerRegistry.getAllWorkers()) {
        if (worker.current_task === task_id) {
          worker.current_task = null;
          break;
        }
      }
      
      if (logger) {
        logger.log('TASK_FORCE_RELEASED', { task_id, reason });
      }
      
      stateManager.saveCheckpoint();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            released: true,
            task_id,
            moved_to: "inbox",
            reason
          })
        }]
      };
    } catch (err) {
      return formatError(err);
    }
  }
);
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/constants.mjs` (add tool name) |
| MODIFY | `src/mcp-server/tools.mjs` (register tool) |

## Verification
- Tạo task trong active/ → gọi `force_release_task` → task phải move sang inbox/
- Gọi `force_release_task` với task_id không tồn tại → phải trả error
- Worker assignment phải bị clear

## Done Criteria
- [ ] Tool registered và callable
- [ ] Move task từ active/ → inbox/
- [ ] Clear worker assignment
- [ ] Checkpoint saved
- [ ] Error khi task không tồn tại trong active/
