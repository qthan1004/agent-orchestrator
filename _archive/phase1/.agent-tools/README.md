# Dev Tools

Scripts dành cho development agent-orchestrator. **KHÔNG** đi kèm sản phẩm.

## Task Management (file-based `tasks/` folder)

| Tool | Chức năng |
|------|-----------|
| `pick-task.mjs` | Pick task FIFO từ `tasks/pending` → `tasks/processing` |
| `complete-task.mjs` | Chuyển task `tasks/processing` → `tasks/done` |
| `task-board.mjs` | Board summary `tasks/{pending,processing,done}` |
| `check-deps.mjs` | Kiểm tra dependencies giữa tasks |

## Code Analysis

| Tool | Chức năng |
|------|-----------|
| `code-index.mjs` | Scan `src/` → generate code map MD |

## Git

| Tool | Chức năng |
|------|-----------|
| `git-push.sh` | Bash: git add + commit + push |
| `git-push.mjs` | Node.js: git add + commit + push |

## Testing

| Tool | Chức năng |
|------|-----------|
| `test-mcp-client.mjs` | Basic MCP connection test |
| `test-all-tools.mjs` | Comprehensive 11-tool integration test |
| `test-multi-session.mjs` | Multi-session shared state test |

## Cách dùng

```bash
node .agent/tools/<script.mjs>
# or
bash .agent/tools/git-push.sh "<message>"
```
