# Agent Orchestrator — System Report

> Cập nhật: 2026-05-10 | Version: 0.2.0 | Phase: **Phase 2 — Hybrid Agentic Architecture**

---

## 1. Tổng quan: Mình đã có gì?

### Architecture

```
┌─────────────┐    plan/pending/     ┌──────────────┐    spawn      ┌──────────┐
│    HEAD      │ ──────────────────▶  │    BODY       │ ──────────▶  │  WORKER  │
│  (Planner)   │                     │ (Orchestrator)│              │ (Runner) │
└─────────────┘                     └──────────────┘              └──────────┘
     │                                    │                           │
     │ Phân tích plan                     │ Phân phối task            │ Execute
     │ Break thành tasks                  │ Spawn subprocess          │ Tool calls
     │ Submit decomposition               │ Monitor lifecycle         │ Report result
     ▼                                    ▼                           ▼
  plan/done/                         exchange/inbox/ → active/ → outbox/
```

**Flow một chiều:** Head → Body → Worker. Worker không tự nhận task.

### Components đã build

| Component | File(s) | Status | Mô tả |
|-----------|---------|--------|-------|
| **MCP Server** | `src/mcp-server/index.ts` | ✅ Done | Express + Streamable HTTP transport |
| **State Manager** | `src/mcp-server/state-manager.ts` | ✅ Done | File-based task queue, plan lifecycle |
| **Task Queue** | `src/mcp-server/task-queue.ts` | ✅ Done | DAG-based task scheduling, group dependencies |
| **Plan Watcher** | `src/mcp-server/plan-watcher.ts` | ✅ Done | Auto-poll plan/pending/, đa workspace |
| **Recovery Manager** | `src/mcp-server/recovery.ts` | ✅ Done | Crash recovery, stale worker detection, orphan requeue |
| **Dispatch Loop** | `src/worker/dispatch-loop.ts` | ✅ Done | Pick task → select model → spawn worker → monitor |
| **Agent Runner** | `src/worker/agent-runner.ts` | ✅ Done | One-shot worker: stdin → LLM → tools → notify → exit |
| **Process Manager** | `src/worker/process-manager.ts` | ✅ Done | Spawn/kill worker subprocesses, timeout handling |
| **Model Selector** | `src/worker/model-selector.ts` | ✅ Done | Select LLM profile based on task complexity |
| **VRAM Manager** | `src/worker/vram-manager.ts` | ✅ Done | Monitor GPU VRAM, auto-unload models |
| **Token Counter** | `src/worker/token-counter.ts` | ✅ Done | Track token usage, checkpoint at 80% |
| **Prompt Builder** | `src/worker/prompt-builder.ts` | ✅ Done | Build system prompt from templates + skills |
| **Tool Executor** | `src/worker/tool-executor.ts` | ✅ Done | Execute MCP tools from worker context |
| **Ollama Adapter** | `src/worker/adapters/ollama-adapter.ts` | ✅ Done | Local LLM via Ollama API |
| **Gemini Adapter** | `src/worker/adapters/gemini-adapter.ts` | ✅ Done | Cloud LLM via Gemini API |
| **Worker Registry** | `src/utils/worker-registry.ts` | ✅ Done | Register/track workers, heartbeat, roles |
| **Workspace Registry** | `src/utils/workspace-registry.ts` | ✅ Done | Multi-workspace registration |
| **Config System** | `src/config.ts` + `src/models/config.ts` | ✅ Done | Runtime config with profile support |
| **Startup Prompt** | `src/utils/startup-prompt.ts` | ✅ Done | Interactive CLI setup |

### MCP Tools available

| Tool | Mục đích |
|------|----------|
| `register_worker` | Register worker mới, nhận UUID |
| `complete_task` | Worker báo hoàn thành task |
| `report_progress` | Worker báo tiến độ |
| `submit_decomposition` | Planner submit tasks + DAG |
| `get_queue_status` | Xem trạng thái queue |
| `get_status` | Server status + version |
| `get_checkpoint` | Lấy checkpoint path |
| `request_retry` | Retry task đã fail |
| `force_release_task` | Force release task bị stuck |
| `get_template` | Lấy template file |
| `ping` | Keepalive heartbeat |
| `scan_workspace` | Scan workspace, sinh workspace-memory.md |
| `session_checkpoint` | Save/load/clear session state |

### Completed tasks (Phase 2)

23 tasks đã done (P2-PRE → P2-19), bao gồm:
- Phase 1 cleanup + archive
- Config model refactor
- Runtime directory bootstrap
- Workspace registration
- StateManager path migration
- PlanWatcher multi-workspace
- Ollama client + Cloud LLM adapter
- Worker process manager
- Model selector
- Server profiles
- Tool executor
- Token counter
- Agent runner + reflexion
- Worker prompt system
- Task dispatch loop
- VRAM manager
- Server hybrid integration
- Git worktree support
- Unified checkpoint
- Mandatory changelog

### Pending tasks

19 tasks remaining (P2-20 → P2-30 + WM01-WM08):
- E2E integration, docs, case bank, domain detection
- Workspace code search, assignment API, workspace scope contract
- Deprecate pull APIs, orchestrator dispatch, memory tests, worker registration
- Workspace Memory series (RAG, file scanner, git context, memory generator, etc.)

---

## 2. Cách sử dụng — Hướng dẫn Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Ollama | Latest | `ollama --version` |
| GPU | NVIDIA + VRAM ≥ 8GB | `nvidia-smi` |

### Bước 1: Cài dependencies

```bash
cd d:\workspace\agent-orchestrator
npm install
```

### Bước 2: Pull model (nếu chưa có)

> **Ollama sẽ tự động được start bởi server** — không cần `ollama serve` thủ công.
> Chỉ cần đảm bảo Ollama đã được cài đặt: https://ollama.com/download

```bash
# Model nhỏ cho dev/test (~4.7GB VRAM)
ollama pull qwen2.5-coder:7b

# Hoặc model lớn hơn (~9GB VRAM)
ollama pull qwen2.5-coder:14b
```

### Bước 3: Start server

```bash
# Development mode (hot reload)
npm run dev

# Hoặc production mode
npm run build && npm run serve
```

Server sẽ hỏi config:

```
MCP Orchestrator Setup
────────────────────────

? Configuration (default/custom) [default]: 
```

- Nhấn **Enter** để dùng defaults (port 3847, workspace = current dir)
- Hoặc chọn **custom** để tùy chỉnh port, workspace root, plan watcher interval

Output khi thành công:

```
┌───────────────────────────────────┐
│  MCP Server listening :3847       │
│  Transport: Streamable HTTP       │
│  Endpoint: /mcp                   │
│  Health: /health                  │
│  Version: 0.2.0                   │
└───────────────────────────────────┘
  Recovery: clean
  Plan watcher: polling every 30s
  HYBRID profile activated: Dispatch loop and VRAM monitoring started.
```

### Bước 4: Verify — Health check

```bash
curl http://localhost:3847/health | jq
```

Response:
```json
{
  "status": "ok",
  "uptime": 5.123,
  "version": "0.2.0",
  "last_start_clean": true,
  "orphans_recovered": 0,
  "connected_workers": 0,
  "plan_watcher": { "running": true, "interval_ms": 30000 },
  "ollama_status": true,
  "vram": { ... },
  "dispatch_loop": "running",
  "active_workers": 0
}
```

### Bước 5: Tạo plan để test

Tạo file plan markdown trong `plan/pending/`:

```bash
# Ví dụ: tạo một plan test
cat > plan/pending/test-plan.md << 'EOF'
# Test Plan

## Goal
Tạo file hello.txt với nội dung "Hello from orchestrator"

## Tasks
1. Tạo file hello.txt trong workspace root
2. Verify file tồn tại
EOF
```

**Plan Watcher** sẽ tự động detect file mới (mỗi 30s) và move sang `plan/processing/`.

### Bước 6: Dùng MCP tool để submit tasks

Khi planner (Head) đã phân tích plan, nó sẽ gọi `submit_decomposition` qua MCP:

```bash
# Test trực tiếp bằng curl (giả lập MCP call)
curl -X POST http://localhost:3847/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "submit_decomposition",
      "arguments": {
        "tasks": [
          {"id": "01-create-file", "module": "fs", "action": "create", "verification": "file exists"}
        ],
        "graph": {
          "groups": [{"group_id": 1, "tasks": ["01-create-file"]}]
        },
        "reasoning": "Single task plan",
        "source_plan": "test-plan.md"
      }
    },
    "id": 1
  }'
```

### Bước 7: Monitor

```bash
# Xem queue status
curl -X POST http://localhost:3847/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_queue_status","arguments":{}},"id":1}'

# Xem exchange directory
ls exchange/inbox/     # Tasks chờ
ls exchange/active/    # Tasks đang chạy
ls exchange/outbox/    # Tasks đã xong
```

---

## 3. Cấu trúc thư mục quan trọng

```
agent-orchestrator/
├── src/                    # Source code
│   ├── index.ts            # Entry point
│   ├── config.ts           # Config loader
│   ├── constants.ts        # All constants
│   ├── models/             # TypeScript interfaces
│   ├── mcp-server/         # Body (Orchestrator)
│   │   ├── index.ts        # Server startup
│   │   ├── tools.ts        # MCP tool handlers
│   │   ├── state-manager.ts # Task state machine
│   │   ├── task-queue.ts   # DAG queue
│   │   ├── recovery.ts     # Crash recovery
│   │   ├── plan-watcher.ts # Auto-detect plans
│   │   └── tools/          # Tool implementations
│   ├── worker/             # Worker infrastructure
│   │   ├── agent-runner.ts # One-shot worker process
│   │   ├── dispatch-loop.ts # Task → worker dispatch
│   │   ├── process-manager.ts # Subprocess management
│   │   ├── adapters/       # LLM adapters (Ollama, Gemini)
│   │   └── ...
│   └── utils/              # Shared utilities
├── exchange/               # File-based IPC
│   ├── inbox/              # Tasks pending execution
│   ├── active/             # Tasks in progress
│   ├── outbox/             # Completed tasks + results
│   ├── checkpoints/        # Queue snapshots
│   └── logs/               # Event logs
├── plan/                   # Plan lifecycle
│   ├── pending/            # Drop plans here → auto-detected
│   ├── processing/         # Currently being decomposed
│   └── done/               # Completed plans
├── prompts/workers/        # Worker prompt templates
├── reference/skills/       # Product skills for workers
└── _archive/               # Archived code (Phase 1 + pull-model)
```

---

## 4. Lưu ý hiện tại

> [!NOTE]
> **Ollama được tự động start.** Server sẽ detect và spawn `ollama serve` nếu chưa chạy. Chỉ cần đảm bảo Ollama đã được **cài đặt** (https://ollama.com/download) và đã **pull model** trước khi chạy.

> [!NOTE]
> **Model Selector hiện dùng hardcoded profiles.** Task P2-07 đã implement nhưng cần config model name phù hợp với models đã pull trong Ollama.

> [!NOTE]
> **Worker chưa có assignment API chính thức.** Tasks P2-25, P2-28 đang pending. Hiện dispatch loop tự pick task từ queue và spawn worker — đúng hướng nhưng chưa có formal contract.
