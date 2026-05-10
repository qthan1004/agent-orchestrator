# Agent Orchestrator - System Report and Usage Guide

> Updated: 2026-05-11  
> Version: 0.2.0  
> Phase: Phase 2 - Hybrid Agentic Architecture

---

## 1. What this server currently is

This repo now has a usable **local orchestration server** for an assignment-first agent workflow:

`Head (human + IDE agent) -> Orchestrator server -> one-shot Worker process`

Canonical flow:
1. Head prepares a plan or task in the workspace.
2. Head registers task metadata with the server.
3. Orchestrator decides dispatch.
4. Worker receives exactly one assigned payload.
5. Worker executes inside workspace scope.
6. Worker reports completion back to the server.

Important:
- Pull-style task claiming is no longer the canonical path.
- `get_next_task`, auto-pickup semantics, and worker-driven claiming should be treated as compatibility-only language if they still appear in older docs.

---

## 2. What the server can do today

### Core orchestration

- Start an MCP server over Streamable HTTP at `/mcp`
- Expose health status at `/health`
- Maintain workspace-scoped runtime state
- Watch `plan/pending/` and move detected plans into processing
- Store and manage task queue state using file-based IPC
- Dispatch work in hybrid mode through an orchestrator-owned loop
- Spawn one-shot worker subprocesses
- Pass assignment payloads to workers over `stdin`
- Receive worker completion via HTTP callback
- Persist queue checkpoints and daily logs
- Recover from stale workers, crashes, and orphaned active tasks

### Assignment-first task execution

- `submit_task` can register planner-created markdown task files from the workspace
- Task metadata is parsed from YAML frontmatter
- Queue scheduling uses:
  - dependency resolution
  - target file conflict detection
  - priority ordering
  - fewer target files first
  - FIFO fallback
- Dispatch payload includes workspace-scoped context before execution
- Worker write scope is enforced against declared `target_files`
- Scope violations are blocked and reported back

### Workspace lifecycle

- Explicit workspace registration
- Deterministic workspace ID from absolute path
- Close/reopen workspace lifecycle exists
- Runtime data can be preserved across reopen

---

## 3. Main runtime pieces

### Server side

- [src/mcp-server/index.ts](D:/workspace/agent-orchestrator/src/mcp-server/index.ts:1)
  Starts Express, MCP transport, health route, worker completion callback, recovery, watcher, dispatch loop.

- [src/mcp-server/tools.ts](D:/workspace/agent-orchestrator/src/mcp-server/tools.ts:1)
  Registers MCP tools such as `register_worker`, `submit_task`, `complete_task`, `report_progress`, `submit_decomposition`.

- [src/mcp-server/state-manager.ts](D:/workspace/agent-orchestrator/src/mcp-server/state-manager.ts:1)
  Owns file-state transitions for queue, plans, outbox, retries, checkpoints.

- [src/mcp-server/task-queue.ts](D:/workspace/agent-orchestrator/src/mcp-server/task-queue.ts:1)
  In-memory queue with DAG/dependency checks, conflict detection, dispatchable ordering.

### Worker side

- [src/worker/dispatch-loop.ts](D:/workspace/agent-orchestrator/src/worker/dispatch-loop.ts:1)
  Canonical dispatch loop. Picks dispatchable task, selects model profile, creates assignment envelope, spawns worker.

- [src/worker/agent-runner.ts](D:/workspace/agent-orchestrator/src/worker/agent-runner.ts:1)
  One-shot worker runner. Receives assignment payload via `stdin`, executes tools, posts completion.

- [src/worker/tool-executor.ts](D:/workspace/agent-orchestrator/src/worker/tool-executor.ts:1)
  Local workspace tool executor with path sandbox and `target_files` write-scope enforcement.

### Shared models and registries

- [src/models/assignment.ts](D:/workspace/agent-orchestrator/src/models/assignment.ts:1)
  Canonical assignment-first contract and assignment envelope types.

- [src/models/task-metadata.ts](D:/workspace/agent-orchestrator/src/models/task-metadata.ts:1)
  Task frontmatter parser and server-side metadata model.

- [src/utils/worker-registry.ts](D:/workspace/agent-orchestrator/src/utils/worker-registry.ts:1)
  Worker registration, heartbeat tracking, assignment ownership, disconnect handling.

---

## 4. MCP tools you can use now

### Canonical tools

- `register_worker`
- `submit_task`
- `complete_task`
- `report_progress`
- `get_status`
- `get_queue_status`
- `get_checkpoint`
- `request_retry`
- `force_release_task`
- `get_template`
- `ping`
- `scan_workspace`
- `session_checkpoint`

### Transitional / not canonical

- `submit_decomposition`
  Still useful for planner-style decomposition flow.

### Compatibility-only language

- Any old mention of `get_next_task`
- Any old mention of auto-pickup semantics
- Any old worker-driven claiming flow

---

## 5. Current strengths

- The server has a real orchestrator-owned dispatch loop.
- The queue now understands task metadata, not just generic task blobs.
- Worker execution has actual workspace boundaries.
- State is inspectable on disk, which makes debugging easier.
- Recovery and retries are already part of the runtime, not bolted on later.

---

## 6. Current limitations and review notes

These are the main things to keep in mind when using it today:

- Versioned docs in `dev-docs/documents/` still contain historical pull-model references.
- Canonical usage is clearer in code than in older documentation.
- The most reliable path today is the hybrid server + orchestrator-owned dispatch path, not legacy planner/worker polling language.
- End-to-end usage is already possible, but the ergonomics around planner-side task creation and automated test scenarios still need polish.
- README / operator docs are not fully caught up yet.

Net result:
- As a core experimental orchestrator, this is already usable.
- As a polished external-facing product, it still needs docs and E2E hardening.

---

## 7. Prerequisites

### Required

- Node.js 18+
- npm 9+
- Ollama installed

### Recommended

- NVIDIA GPU if you want the intended local-model flow
- `curl` for quick health and MCP checks

### Check commands

```powershell
node -v
npm -v
ollama --version
```

---

## 8. Install and setup

From repo root:

```powershell
cd D:\workspace\agent-orchestrator
npm install
```

If you want local worker execution through Ollama, pull at least one model first. The current codebase may reference different model names depending on profile/config, so verify what you want to use before long runs.

Example:

```powershell
ollama pull qwen3.5:9b-q4_k_m
ollama pull qwen3.5:4b-q4_k_m
```

Important:
- The server tries to auto-start Ollama if needed.
- That does not replace model download. You still need models available locally.

---

## 9. How server startup works

Entry point:

- `npm run dev` -> `tsx src/index.ts serve`
- `npm run build` -> compile TypeScript
- `npm run serve` -> `node dist/index.js serve`

Startup sequence:
1. Prompt for config
2. Require explicit workspace root
3. Load config
4. Bootstrap directories
5. Register primary workspace
6. Restore runtime state and recovery context
7. Start plan watcher
8. Start hybrid dispatch loop
9. Start VRAM monitoring
10. Start Express + MCP transport

---

## 10. Start the server

### Development mode

```powershell
npm run dev
```

### Production mode

```powershell
npm run build
npm run serve
```

### Startup prompt behavior

You will be asked:

```text
? Configuration (default/custom) [default]:
```

If you choose default:
- workspace root = current working directory
- port = `3847`
- profile = `hybrid`
- plan watcher = `30` seconds

If you choose custom:
- you must provide an absolute workspace path
- you can customize server port
- you can customize plan watcher interval

Important:
- Workspace root is mandatory.
- There is no implicit workspace discovery.

---

## 11. What “successful startup” should look like

You should see output similar to:

```text
MCP Server listening :3847
Transport: Streamable HTTP
Endpoint: /mcp
Health: /health
Version: 0.2.0
Recovery: clean
HYBRID profile activated: Dispatch loop and VRAM monitoring started.
```

You should also see:
- primary workspace path
- workspace ID
- whether workspace runtime directories were created

---

## 12. Quick smoke test

### 1. Build check

```powershell
npm run build
```

### 2. Start the server

```powershell
npm run dev
```

### 3. Health check

```powershell
curl http://127.0.0.1:3847/health
```

You want to see fields like:
- `status: "ok"`
- `version: "0.2.0"`
- `dispatch_loop: "running"`
- `plan_watcher.running`

### 4. Inspect runtime directories

After startup, confirm these exist:

```powershell
Get-ChildItem exchange
Get-ChildItem plan
```

Expected high-level dirs:
- `exchange/inbox`
- `exchange/active`
- `exchange/outbox`
- `exchange/checkpoints`
- `exchange/logs`
- `plan/pending`
- `plan/processing`
- `plan/done`

---

## 13. How to test it in a realistic way

### Path A: plan watcher + planner decomposition

Use this if you want to test the historical planner-style flow:

1. Start server.
2. Put a markdown plan into `plan/pending/`.
3. Let `plan-watcher` move it to `plan/processing/`.
4. Use MCP to call `submit_decomposition(...)`.
5. Watch task JSON files appear in `exchange/inbox/`.

This path still exists, but it is not the cleanest canonical story anymore.

### Path B: canonical assignment-first task submission

Use this if you want to test the current core direction:

1. Start server.
2. Create a markdown task file inside the workspace with YAML frontmatter.
3. Register it through `submit_task`.
4. Watch the server store metadata in the queue.
5. Let the dispatch loop assign it to a worker.
6. Watch it move through:
   - `exchange/inbox`
   - `exchange/active`
   - `exchange/outbox`

This is the path most aligned with the current architecture.

---

## 14. Example task file for `submit_task`

Put this in your workspace, for example:

`tasks/pending/demo-task.md`

```md
---
task_id: DEMO-01
action: implement
depends_on: []
target_files:
  - hello.txt
read_files: []
priority: 0
---

Create `hello.txt` in the workspace root with a short test string.
```

Then the Head can register it with `submit_task` using:

- `task_id = "DEMO-01"`
- `workspace_id = <your registered workspace id>`
- `task_content_path = "tasks/pending/demo-task.md"`

---

## 15. What to monitor while testing

### Health endpoint

```powershell
curl http://127.0.0.1:3847/health
```

### Queue status

Call MCP tool `get_queue_status`.

### Runtime files

Watch:
- `exchange/inbox`
- `exchange/active`
- `exchange/outbox`
- `exchange/checkpoints`
- `exchange/logs`

### Worker state

Watch:
- `exchange/workers.json`

You should see worker registration, assignment ownership, and status changes.

---

## 16. What success looks like in canonical flow

For a healthy assignment-first run:

1. Server starts cleanly.
2. Workspace registers successfully.
3. `submit_task` accepts the task file.
4. Task metadata is written to queue state.
5. Dispatch loop picks the task.
6. Worker is assigned exactly one task.
7. Worker writes only inside declared `target_files`.
8. Task ends in `exchange/outbox`.
9. Health and logs remain stable.

---

## 17. Recommended short test checklist

- `npm install`
- `npm run build`
- `npm run dev`
- `curl http://127.0.0.1:3847/health`
- confirm `exchange/` and `plan/` dirs exist
- create one markdown task with YAML frontmatter
- register it through `submit_task`
- confirm movement `inbox -> active -> outbox`
- inspect `workers.json` and logs

---

## 18. Bottom line

### What you have

You already have a serious local orchestrator core:
- MCP server
- file-backed queue/runtime
- workspace identity
- orchestrator-owned dispatch
- assignment payloads
- worker scope enforcement
- recovery and retries

### What you can do with it now

- Run the server locally
- Register a real workspace
- Submit canonical task files
- Let the orchestrator assign and execute tasks
- Observe queue state and worker lifecycle on disk
- Smoke test recovery / retry / scope protection

### What still needs polish

- operator-facing docs outside this file
- more complete E2E walkthroughs
- cleanup of older versioned pull-model docs
- more explicit test harness around canonical assignment flow
