# Implement Full MCP Tools

- **Phase**: C — File IPC + Core MCP Tools
- **Goal**: Implement tất cả MCP tools cho orchestration workflow

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/index.mjs` |
| NEW | `src/mcp-server/tools.mjs` |

## What to Do

Tách tool definitions ra `tools.mjs`, register vào MCP server.

### Tools to implement:

#### 1. `register_worker()` (đã có từ task 06 — verify still works)

#### 2. `get_next_task(worker_id)`
- Validate worker_id exists trong registry
- Gọi `taskQueue.getNextTask()`
- StateManager: move task inbox → active
- Update worker registry: current_task = task_id
- Logger: log TASK_ASSIGNED event
- Return: `{ task_id, file_path }` (RELATIVE path!)

#### 3. `complete_task(task_id, status, summary, worker_id)`
- Validate worker_id owns this task
- Status: `done` | `blocked` | `failed`
- StateManager: move active → outbox + write result
- Update worker registry: current_task = null, tasks_completed++
- Logger: log TASK_COMPLETED event
- Check DAG: unlock next groups if applicable
- saveCheckpoint()
- Return: `{ accepted, next_unlocked: [task_ids] }`

#### 4. `report_progress(task_id, step, percentage)`
- Update worker heartbeat
- Logger: log PROGRESS event
- Return: void

#### 5. `get_queue_status()`
- Return: `{ total, pending, active, done, blocked, failed, workers: count }`

#### 6. `get_checkpoint()`
- Return: `{ checkpoint_file_path }` (latest checkpoint)

#### 7. `get_plan_for_decomposition()`
- Return: `{ plan_file_path, template_path }`
- Agent sẽ dùng `view_file()` để đọc (token-efficient)

#### 8. `submit_decomposition(tasks[], graph, reasoning)`
- Validate:
  - tasks.length ≤ 20
  - Mỗi task có required fields: id, module, action, verification
  - Task ID format: `XX-kebab-case`
  - No circular deps trong graph
- Nếu valid: store tasks + build queue
- Nếu invalid: return `{ accepted: false, errors: [...] }`

#### 9. `request_retry(task_id, reason, attempt)`
- Check attempt ≤ 3
- StateManager: move outbox/failed → inbox (requeue)
- Update task metadata: attempt++
- Return: `{ approved, file_path }`

### Tool Schema

Mỗi tool dùng `zod` để define input schema:
```javascript
server.tool("get_next_task",
  { worker_id: z.string().describe("Your worker UUID from register_worker") },
  async ({ worker_id }) => { ... }
);
```

## Constraints

- MCP tools trả về `file_path` (relative) — KHÔNG trả full data
- Validate inputs rigorously — reject sớm nếu sai
- Log mọi tool call quan trọng (assign, complete, retry)

## Dependencies

- `12-mcp_state-manager-queue` phải xong trước

## Verification

Start server → mở Antigravity session → gọi lần lượt:
1. `register_worker()` → nhận worker_id
2. `get_queue_status()` → thấy 0 tasks
3. `get_plan_for_decomposition()` → nhận paths

## Done Criteria

- [ ] 9 tools registered trong MCP server
- [ ] Mỗi tool có zod schema validation
- [ ] `get_next_task` returns relative file_path
- [ ] `complete_task` triggers DAG unlock check
- [ ] `submit_decomposition` validates all constraints
- [ ] All tools log events qua logger
