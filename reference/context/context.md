---
description: Agent Orchestrator project structure and conventions
---

# Agent Orchestrator Context

## Architecture
- **Dual-Layer**: MCP (coordination) + File IPC (data provider)
- **MCP Server**: SSE transport, shared state across sessions
- **File IPC**: `exchange/` dirs — token-efficient context recovery
- **Runtime**: All agents run through Antigravity (regardless of model)
- **Cross-platform**: Linux (primary) + Windows (WSL/Git Bash)

## Structure

```
agent-orchestrator/
├── plan/                          ← Plan documents (MD)
├── reference/                     ← Reference materials (skills, workflows, tools, context)
├── templates/                     ← JSON contract templates
├── src/                           ← MCP Server source code
│   ├── index.mjs                  ← CLI entry
│   ├── config.mjs                 ← Config + paths
│   ├── mcp-server/                ← MCP Server layer
│   └── utils/                     ← Helpers (file-backend, checkpoint, etc.)
├── exchange/                      ← File IPC — Data Provider Layer
│   ├── inbox/                     ← Tasks chờ agent nhận
│   ├── active/                    ← Tasks đang xử lý
│   ├── outbox/                    ← Kết quả agent trả về
│   └── checkpoints/               ← State snapshots
├── tools/                         ← Node.js automation scripts (token-saving)
├── .agent/                        ← Antigravity integration
│   ├── skills/                    ← Agent skills
│   └── workflows/                 ← Agent workflows (slash commands)
└── package.json
```

## Conventions
- **Paths**: Relative paths + `path.join()` — cross-platform Linux/Windows
- **MCP responses**: Return `file_path` (not full data) → agent dùng `view_file()`
- **Git**: Branch `master`. Conventional Commits format.
- **Timeout**: Stop any command exceeding 30s with no output.

## Skills (`.agent/skills/`)

| Skill | Mô tả |
|-------|--------|
| `orchestrator-protocol` | Master protocol: MCP connect → pull → execute → complete |
| `strict-scope` | Do ONLY what was asked — no extra refactors |
| `token-optimization` | Context management, Index Pattern, Turn Limit |
| `git-commit-convention` | Conventional Commits format |

## Workflows (`.agent/workflows/`)

| Workflow | Mô tả |
|----------|--------|
| `/start-server` | Khởi động MCP Server + verify |
| `/orchestrate` | Full flow: decompose → execute |
| `/worker` | Worker mode: pull → execute → complete loop |
| `/decompose` | Parse plan → tạo atomic tasks |
| `/status` | Xem queue status + progress |
| `/save-plan` | Lưu plan vào `plan/` theo format chuẩn |
| `/save-bug-report` | Lưu bug report theo format chuẩn |
| `/git-push` | Git commit + push |

## Tools (`tools/`)

| Script | Mô tả |
|--------|--------|
| `health-check.mjs` | Check MCP server status, return JSON |
| `queue-status.mjs` | Scan exchange/ dirs, return task summary |
| `init-exchange.mjs` | Create exchange directory structure |
| `task-scanner.mjs` | Scan & summarize tasks across all dirs |
| `git-push.sh` | Git add + commit + push (no submodules) |

## Reference Skills (`reference/skills/`)

Portable skills dùng chung cho nhiều project:

| Skill | Mô tả |
|-------|--------|
| `task-delegation` | Planner/Worker protocol, ticket template (evolve → orchestrator-protocol) |
| `strict-scope` | Do ONLY what user asked — no extra refactors |
| `token-optimization` | Context management, Index Pattern, Turn Limit |
| `git-commit-convention` | Commit message format |
