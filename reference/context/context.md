---
description: Agent Orchestrator project structure and conventions
---

# Agent Orchestrator Context

## Architecture
- **Dual-Layer**: MCP (coordination) + File IPC (data provider)
- **MCP Server**: Streamable HTTP transport (`/mcp` endpoint), shared state across sessions
- **File IPC**: `exchange/` dirs — token-efficient context recovery
- **Runtime**: All agents run through Antigravity (regardless of model)
- **Cross-platform**: Linux + Windows — 1 solution, no OS detection

## Structure

```
agent-orchestrator/
├── prompts/                       ← Agent prompt templates
│   └── agent-prompt.md            ← Unified prompt (dynamic role switching)
├── reference/                     ← Ships with orchestrator (product assets)
│   ├── skills/                    ← Skills for agents using the orchestrator
│   │   ├── orchestrator-protocol/ ← Core MCP interaction protocol
│   │   └── strict-scope/          ← Worker scope enforcement
│   ├── tools/                     ← Orchestrator operational scripts
│   └── context/                   ← Project context docs
├── templates/                     ← JSON contract templates
├── src/                           ← MCP Server source code
│   ├── index.mjs                  ← CLI entry
│   ├── config.mjs                 ← Config + paths (cross-platform)
│   ├── mcp-server/                ← MCP Server layer (Streamable HTTP)
│   └── utils/                     ← Helpers (file-backend, logger, worker-registry, etc.)
├── exchange/                      ← File IPC — Data Provider Layer
│   ├── inbox/                     ← Tasks chờ agent nhận
│   ├── active/                    ← Tasks đang xử lý
│   ├── outbox/                    ← Kết quả agent trả về
│   ├── checkpoints/               ← State snapshots
│   └── logs/                      ← Structured MD logs (daily, append-only)
├── .agent/                        ← Dev-only (NOT shipped with product)
│   ├── skills/                    ← Dev skills (git-commit, token-optimization, etc.)
│   ├── workflows/                 ← Dev workflows (slash commands)
│   └── tools/                     ← Dev tools (git-push.sh)
└── package.json
```

## Conventions
- **Paths**: `path.join()` + `import.meta.url` — 1 API cho cả Linux/Windows
- **MCP responses**: Return `file_path` (not full data) → agent dùng `view_file()`
- **Worker ID**: UUID — only MCP server creates/manages
- **Logging**: Structured MD logs → `exchange/logs/YYYY-MM-DD.md`
- **Tools output**: Tạo file MD tạm → agent đọc → xong xóa (token-saving)
- **File writes**: Atomic write-then-rename pattern
- **Symlinks**: `symlinkSync('junction')` — 1 API, cả 2 OS
- **Git**: Branch `master`. Conventional Commits format.
- **Naming**: `<module>_<description>_<version>` for plan files
- **Timeout**: Stop any command exceeding 30s with no output.

## Reference Skills (`reference/skills/`)

Skills đi kèm orchestrator — agents kết nối vào hệ thống sẽ đọc các skill này:

| Skill | Mô tả |
|-------|--------|
| `orchestrator-protocol` | Core protocol: register → dynamic role → pull → execute → complete |
| `strict-scope` | Do ONLY what was asked — no extra refactors |

## Dev Skills (`.agent/skills/`)

Skills chỉ dùng khi phát triển project này:

| Skill | Mô tả |
|-------|--------|
| `git-commit-convention` | Conventional Commits format |
| `strict-scope` | Do ONLY what user asked |
| `token-optimization` | Context management, Index Pattern, Turn Limit |

## Dev Workflows (`.agent/workflows/`)

| Workflow | Mô tả |
|----------|--------|
| `/pick-task` | Pick task nhỏ nhất (FIFO) → execute |
| `/push-git` | Git commit + push |
| `/save-plan` | Lưu plan vào `plan/` theo format chuẩn |
| `/save-bug-report` | Lưu bug report theo format chuẩn |

## Orchestrator Tools (`reference/tools/`)

| Script | Mô tả |
|--------|--------|
| `health-check.mjs` | Server status, uptime, worker count |
| `queue-status.mjs` | Task summary across all dirs |
| `init-exchange.mjs` | Setup exchange/ directory structure |
| `task-scanner.mjs` | Detailed task listing |
| `reset-exchange.mjs` | Xoá data exchange/ (giữ cấu trúc) |

## Dev Tools (`.agent/tools/`)

| Script | Mô tả |
|--------|--------|
| `pick-task.mjs` | Pick task FIFO từ `tasks/pending` → `processing` |
| `complete-task.mjs` | Chuyển task `processing` → `done` |
| `task-board.mjs` | Board summary `tasks/` |
| `check-deps.mjs` | Kiểm tra dependencies giữa tasks |
| `code-index.mjs` | Scan `src/` → code map |
| `git-push.mjs` / `git-push.sh` | Git add + commit + push |
| `test-*.mjs` | Integration tests (MCP client, multi-session, all tools) |
