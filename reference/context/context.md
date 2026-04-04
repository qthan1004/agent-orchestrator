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
├── plan/                          ← Plan documents (MD)
├── reference/                     ← Reference materials (skills, workflows, tools, context)
├── templates/                     ← JSON contract templates
├── src/                           ← MCP Server source code
│   ├── index.mjs                  ← CLI entry
│   ├── config.mjs                 ← Config + paths (cross-platform)
│   ├── mcp-server/                ← MCP Server layer (Streamable HTTP)
│   └── utils/                     ← Helpers (file-backend, logger, worker-registry, etc.)
├── tools/                         ← Node.js automation scripts (output MD, token-saving)
├── exchange/                      ← File IPC — Data Provider Layer
│   ├── inbox/                     ← Tasks chờ agent nhận
│   ├── active/                    ← Tasks đang xử lý
│   ├── outbox/                    ← Kết quả agent trả về
│   ├── checkpoints/               ← State snapshots
│   └── logs/                      ← Structured MD logs (daily, append-only)
├── .agent/                        ← Antigravity integration
│   ├── skills/                    ← Agent skills
│   └── workflows/                 ← Agent workflows (slash commands)
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

## Skills (`.agent/skills/`)

| Skill | Mô tả |
|-------|--------|
| `orchestrator-protocol` | Master protocol: MCP connect → register → pull → execute → complete |
| `strict-scope` | Do ONLY what was asked — no extra refactors |
| `token-optimization` | Context management, Index Pattern, Turn Limit |
| `git-commit-convention` | Conventional Commits format |

## Workflows (`.agent/workflows/`)

| Workflow | Mô tả |
|----------|--------|
| `/start-server` | Khởi động MCP Server + verify |
| `/orchestrate` | Full flow: decompose → execute |
| `/worker` | Worker mode: register → pull → execute → complete loop |
| `/decompose` | Parse plan → tạo atomic tasks |
| `/status` | Xem queue status + progress |
| `/save-plan` | Lưu plan vào `plan/` theo format chuẩn |
| `/save-bug-report` | Lưu bug report theo format chuẩn |
| `/git-push` | Git commit + push |

## Tools (`tools/`)

| Script | Output | Mô tả |
|--------|--------|--------|
| `health-check.mjs` | `exchange/.tmp/health.md` | Server status, uptime, worker count |
| `queue-status.mjs` | `exchange/.tmp/queue-status.md` | Task summary across all dirs |
| `init-exchange.mjs` | Creates dirs | Setup exchange/ directory structure |
| `task-scanner.mjs` | `exchange/.tmp/task-scan.md` | Detailed task listing |
| `git-push.sh` | — | Git add + commit + push |

## Reference Skills (`reference/skills/`)

Portable skills dùng chung cho nhiều project:

| Skill | Mô tả |
|-------|--------|
| `task-delegation` | Legacy protocol (evolved → orchestrator-protocol) |
| `strict-scope` | Do ONLY what user asked — no extra refactors |
| `token-optimization` | Context management, Index Pattern, Turn Limit |
| `git-commit-convention` | Commit message format |

## Current Plan

- **Version**: v0.4
- **Plan file**: `plan/2026-04-04_agent-orchestrator_v0.4.md`
- **Status**: Approved — ready for task breakdown
- **Transport**: Streamable HTTP (SSE deprecated)
- **Phases**: A (Core MCP) → B (Skills/Workflows) → C (File IPC) → D (Full Test)
