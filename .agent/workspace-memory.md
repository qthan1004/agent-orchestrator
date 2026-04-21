# Workspace Memory — agent-orchestrator

> **Last updated**: 2026-04-21
> **Curated by**: Human + Antigravity
> **Purpose**: Read this FIRST at session start. Skip full-repo discovery.

## Project Identity

- **Name**: agent-orchestrator
- **Type**: MCP Server (Model Context Protocol) — DAG-based task orchestrator
- **Version**: 0.2.0
- **Stack**: Node.js, TypeScript, ESM (`import`/`export`), Zod validation
- **Entry point**: `src/index.ts` → CLI `serve` command
- **Dev runner**: `tsx` (dev) / `tsc` + `node dist/` (prod)
- **Server port**: 3847 (default, configurable)
- **Transport**: Streamable HTTP at `/mcp`
- **Dependencies**: `@modelcontextprotocol/sdk`, `express`, `zod`

## Architecture — The 3 Principles

### 1. Zero-Knowledge Engine
Orchestrator is a **pure state machine**. It does NOT know or care about the
content of tasks or the target project's language/framework. It only:
- Moves files between `inbox/` → `active/` → `outbox/`
- Resolves DAG constraints (unlock tasks when dependencies complete)
- Manages worker lifecycle (registration, heartbeat, recovery)

### 2. Workspace-Root is the World
All project knowledge lives in the TARGET workspace's `.agent/knowledge/`,
NOT inside the orchestrator server. Orchestrator is stateless relative to
the target project. Zero-coupling.

### 3. Intelligence Lives in Agents
Agents (Planner & Worker) are smart via LLM. Workers scan `.agent/knowledge/`
in the target workspace to learn conventions before executing tasks.

## Key Directories

| Directory | Purpose | Touch? |
|-----------|---------|--------|
| `src/mcp-server/` | Core server: tools, state manager, queue, recovery | ⚠️ Careful |
| `src/utils/` | File backend, logger, startup prompt | ⚠️ Careful |
| `src/config.ts` | Server configuration builder | ⚠️ Careful |
| `src/constants.ts` | All constants, enums, defaults | ⚠️ Careful |
| `src/models/` | Shared TypeScript interfaces (8 files) | ⚠️ Careful |
| `exchange/` | Runtime IPC: inbox/, active/, outbox/, checkpoints/, logs/ | ❌ Product data |
| `plan/` | End-user plan queue: pending/ → processing/ → done/ | ❌ Product data |
| `templates/` | JSON contract templates for tasks | ❌ Product data |
| `prompts/` | Agent prompt templates | ❌ Product data |
| `reference/` | Tools, skills, context for end-user agents | ❌ Product data |
| `dev-docs/` | Developer documentation, plans, architecture | ✅ Dev space |
| `tasks/` | Dev task board: pending/ → processing/ → done/ | ✅ Dev space |
| `.agent/` | Dev brain: skills, workflows, knowledge, memory | ✅ Dev space |
| `tests/` | Test files | ✅ Dev space |

## Core Modules (src/mcp-server/)

| File | Role | Lines |
|------|------|-------|
| `tools.ts` | 14 MCP tools (register_worker, get_next_task, complete_task, etc.) | ~700 |
| `state-manager.ts` | File-based state machine: inbox↔active↔outbox, checkpoints, recovery | ~415 |
| `task-queue.ts` | In-memory DAG queue: group resolution, dependency tracking | ~140 |
| `recovery.ts` | Worker monitoring, stale detection, orphan recovery | ~350 |
| `poll-helpers.ts` | Long-polling helpers for task/plan waiters | ~60 |
| `idle-resolver.ts` | Decides agent action when no tasks available | ~60 |
| `index.ts` | Server bootstrap, tool registration, shutdown handling | ~160 |
| `transport.ts` | Streamable HTTP transport setup | ~60 |
| `plan-watcher.ts` | Periodic scan of plan/pending/ for new plans | ~100 |

## MCP Tools Available

| Tool | Purpose |
|------|---------|
| `register_worker` | Register agent, get UUID + role (PLANNER/WORKER/IDLE) |
| `get_next_task` | Long-poll for next pending task (auto-assigns) |
| `complete_task` | Complete task (DONE/FAILED/BLOCKED), auto-pickup next |
| `report_progress` | Report step + percentage on current task |
| `check_plans` | Long-poll for new plans in plan/pending/ |
| `submit_decomposition` | Submit task breakdown from plan (Planner role) |
| `get_queue_status` | Get pending/active/done counts |
| `get_checkpoint` | Save and get checkpoint path |
| `request_retry` | Requeue a failed task |
| `force_release_task` | Force-release stuck task from active/ |
| `get_template` | Get a template file by name |
| `ping` | Heartbeat keepalive |
| `get_status` | Server version, uptime, worker count |
| `hello_world` | Test connectivity |

## Data Flow

```
Plan file → plan/pending/ → plan/processing/ (Planner decomposes)
                                    ↓
                           submit_decomposition
                                    ↓
Tasks → exchange/inbox/ → exchange/active/ → exchange/outbox/
        (pending)          (worker executing)   (done/failed)
```

## Current State & Active Work

- **Migration**: ✅ TypeScript migration COMPLETE (PR #1, merged 2026-04-21)
- **Active**: Evolution & Local Brain (EV-series, 12 tasks pending)
- **Phase 2 design**: Hybrid architecture with local LLM workers (see `plan_phase2-hybrid-architecture.md`)
- **RAG pipeline**: Local memory tools planned (see `plan_local-rag-gitnaxus-obsidian.md`)
- **Dev-env memory**: This file is Phase 0 of `dev-env_agent-memory-obsidian-gitnexus.md`

## Non-Negotiable Rules

1. **Server owns ALL state** — workers NEVER read/write exchange/, plan/, tasks/
2. **Workers NEVER loop** — server loops, workers are one-shot
3. **File-based IPC** — no WebSockets, no in-memory streams between processes
4. **Dev files ≠ Product files** — dev-docs/ and tasks/ are dev; plan/ and exchange/ are product
5. **TypeScript strict mode** — all source in `.ts`, `strict: true` in tsconfig
6. **Orchestrator does NOT know project content** — it's a pure state machine

## Dev Conventions

- Pure ESM (`import`/`export`), no CommonJS
- Zod for schema validation (all tool inputs)
- Conventional Commits for git messages
- JSDoc for all public functions
- Dev plans → `dev-docs/`, dev tasks → `tasks/pending/`
- Product plans → `plan/pending/` (NEVER mix)

## Skills & Workflows Available

- **Skills**: `folder-convention`, `safe-deletion`, `strict-scope`
- **Workflows**: `/pick-task`, `/push-git`, `/save-bug-report`, `/save-plan`
