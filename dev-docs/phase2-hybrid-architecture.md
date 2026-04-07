# Phase 2: Hybrid Agentic Architecture & Local Worker Integration

> **Tags:** `features`, `architecture`, `phase-2`, `local-llm`
> **Date:** 2026-04-07
> **Status:** Design Finalized
> **Hardware:** Nvidia RTX 5060 Ti 16GB VRAM
> **Inference Engine:** Ollama (headless, OpenAI-compatible API)
> **Review:** See `phase2_review.md` + `phase2_technical_supplement.md` for detailed analysis

---

## 1. Architectural Vision: Server-Centric Unidirectional Data Flow

Phase 2 proposes a paradigm shift from conventional Peer-to-Peer (P2P) agent structures to a highly controlled, biological-inspired **Server-Centric Unidirectional Data Flow** architecture.

### 1.1 Head-Body-Limb Model

*   **The Head (Planner / IDE / Antigravity):** Cognitive intelligence. Responsible for interpreting requirements, generating strategies, and creating actionable task decompositions. The sole entity allowed to ideate and discuss solutions with the human operator.
*   **The Body (Orchestrator Server):** Central nervous system. **Owns ALL state and data.** Responsible for tracking state, scheduling tasks via file-based queue, managing hardware resources (VRAM/RAM), spawning/killing workers, and enforcing security boundaries.
*   **The Limbs (Local Model Workers):** Mechanical execution. Workers are entirely stateless, **one-shot** entities constrained to execute a single atomic task. They receive instructions from the Server, execute using provisioned tools, and report results back.

### 1.2 Two Inviolable Principles

> **Principle 1 — Worker NEVER accesses queue data.**
> Workers do NOT read/write files in `plan/`, `tasks/`, `exchange/`. Server owns all state. Server reads tasks, injects them into workers via spawn args. Workers only call MCP tools to **notify** the server (complete_task, report_progress).

> **Principle 2 — Worker NEVER loops.**
> Server loops. Server spawns a new worker for each task. A worker is born with exactly 1 task → executes → notifies → dies.

### 1.3 Data Access Control

| Action | Server (Body) | Worker (Limb) |
|---|---|---|
| Read/write `plan/`, `tasks/`, `exchange/` | ✅ | ❌ FORBIDDEN |
| Move files between state folders | ✅ | ❌ |
| Decide which model to run | ✅ | ❌ |
| Spawn/kill worker processes | ✅ | ❌ |
| Read task_details | ✅ (provides to worker) | ✅ (receives via stdin) |
| Read/write code at `workspace_root` | ❌ | ✅ (workspace only) |
| Call MCP tools (complete_task, etc.) | N/A | ✅ (notify only) |

### 1.4 Data Flow Policy

Strict Top-Down: **Head → Body → Limbs**. Limbs cannot communicate directly with the Head or each other, avoiding hallucination echo-chambers and preserving systemic consistency.

Communication model:
```
┌──────────┐              ┌──────────────┐              ┌──────────┐
│  SERVER  │◄════════════►│ AGENT RUNNER │─────────────►│   LLM    │
│  (Body)  │ bidirectional │ (middleware) │ unidirectional│ (Ollama) │
└──────────┘              └──────────────┘              └──────────┘

  Server ↔ Runner:  Server sends task + worker_id via stdin
                    Runner sends back: complete_task, checkpoint, progress (HTTP)

  Runner → LLM:    Runner builds prompt, calls Ollama /api/chat
                    Runner parses tool_calls, executes locally
                    LLM NEVER communicates directly with Server

  ⚠️ Direction is always: Server + Runner → Agent (LLM)
     NEVER reverse: LLM → Runner → Server to give commands
```

---

## 2. Pain Points Resolved

The Phase 2 architecture directly addresses critical pain points observed in early Orchestrator development and standard Agent frameworks:

1.  **Out-of-Distribution (OOD) Agent Limitations:** Agents often fail to construct novel architectures, defaulting to generic patterns. Phase 2 keeps high-level design within the Human-IDE loop (Head) to guarantee bespoke solutions.
2.  **Context Leakage & Hallucination Echo-chambers:** P2P agents cross-contaminate their context windows after prolonged interactions. Ephemeral one-shot workers eliminate this.
3.  **Local Hardware Exhaustion (OOM):** Persistent Local LLMs on personal machines crash under sustained long-context operations. Dynamic model selection and aggressive VRAM lifecycle management prevent this.
4.  **Security Risk of Autonomous Execution:** Worker agents with unrestrained tool access are prone to execute destructive actions when hallucinating. Server-controlled tool provisioning and path sandboxing contain this.
5.  **Hallucination of Task IDs / Queue Paths:** With File-based IPC + Server-centric architecture, workers have zero access to queue data. Server injects task_id via stdin — worker only echoes it back. Hallucination of queue-level data is architecturally impossible.

---

## 3. Core Features & Mechanisms

### 3.1. Ephemeral & Sandboxed Workers (One-Shot)

Workers are designed as single-use (ephemeral), one-shot instances. **They do NOT loop.**

*   **Mechanism:** Server spawns a worker subprocess, injects task data via `stdin`. The worker executes using local tools (workspace filesystem only), calls `complete_task()` to notify the server, and exits. Server then unloads the model from VRAM and spawns the next worker for the next task.
*   **Benefit:** Wipes out VRAM bloat and resets the context window at the start of every task. 0% context leakage guaranteed.

### 3.2. File-based IPC (Inter-Process Communication)

The system leverages File-based IPC (reading/writing `.md` and `.json` files) rather than persistent WebSockets or in-memory state streams.

*   **Mechanism:** Workers only receive the specific task context required from the Server (injected via stdin). Workers read/write code files in the `workspace_root` project directory only.
*   **Benefit:** Massively reduces RAM overhead. Eliminates hallucination of task IDs and queue paths — workers have no access to queue directories, so they cannot reference or corrupt them.

### 3.3. Context Window Checkpointing (3-Layer, Mandatory)

To accommodate limited model context lengths on varying hardware (8GB–16GB+ VRAM):

> **This mechanism is MANDATORY** — not optional. While 16GB VRAM with 32K context may rarely exhaust, portability to lower VRAM GPUs (8GB, 12GB) or larger models requires robust checkpointing.

**3-Layer Checkpoint Mechanism:**

```
Layer 1 — Ollama Hard Limit (Inference Guard):
  num_ctx: set per VRAM capacity (32K for 16GB, 8K for 8GB)
  → Ollama auto-truncates if exceeded
  → keep_alive: 0 → free VRAM immediately after response

Layer 2 — Agent Runner Token Monitor (PRIMARY MECHANISM):
  Ollama response returns: prompt_eval_count + eval_count each turn
  → Agent Runner tracks cumulative: total_tokens += each turn
  → If total_tokens > num_ctx * 0.80:
    → Agent Runner calls notifyServer(status: 'checkpoint',
         completed_steps, remaining_steps)
    → Exit process
    → Server requeues task with checkpoint summary as initial context

Layer 3 — Server Timeout (Safety Net):
  Hard timeout: 5 minutes per task
  → Server kills worker process if exceeded
  → Requeues task automatically
```

### 3.4. Dynamic Tool Provisioning + Worker ID

The Server governs the specific tools provided to each Worker and assigns identity.

**Worker ID Assignment:**
*   Server generates a `worker_id` at spawn time and injects it via `stdin` along with task data
*   Worker uses `worker_id` in every notification: `complete_task(worker_id, ...)`, `report_progress(worker_id, ...)`
*   **No `register_worker()` needed** — ID is assigned server-side
*   Server tracks `worker_id → task_id → PID` mapping for monitoring

**Tool Provisioning:**
*   Server determines `allowed_tools` based on task `action` type before spawning
*   Agent Runner only exposes the allowed subset to the LLM — LLM doesn't know other tools exist
*   Path sandbox: Agent Runner rejects any file path outside `workspace_root`

```typescript
// Server injects via stdin:
{
  worker_id: 'w-abc123',
  task_id: 'task-001',
  task_details: { action: 'implement', ... },
  workspace_root: '/path/to/project',
  server_url: 'http://localhost:3847/mcp',
  allowed_tools: ['view_file', 'list_dir', 'write_to_file']
}

// Agent Runner only exposes allowed_tools to LLM:
const tools = payload.allowed_tools.map(name => TOOL_DEFS[name]);
```

### 3.5. Mandatory Changelog Generation for Head Review

To drastically reduce the token consumption required by the Head (Claude) when reviewing completed tasks:

*   **Mechanism:** When the Local Worker finishes execution and calls `complete_task`, it is required to bundle a concise 'Changelog' (detailing exact files touched, line additions, and logic shifted).
*   **Benefit:** The Head does not need to re-read the entire codebase. Claude simply reads the localized Changelog alongside the source control diff.

### 3.6. Agent Runner — One-Shot Executor & Middleware

The Agent Runner is the **most critical component** of Phase 2. It is a Node.js subprocess that acts as middleware between the Server and the LLM.

**Responsibilities:**
1.  Receive task + worker_id from Server via `stdin` (no `get_next_task()` call)
2.  Build optimized prompt for LLM based on task_details
3.  Call Ollama `/api/chat` with tool definitions
4.  Parse LLM tool_calls → execute locally on workspace filesystem
5.  Monitor token usage → trigger checkpoint if >80% context
6.  Notify server via HTTP: `complete_task(worker_id, summary)`
7.  Exit process (one-shot, no loop)

**Enforcement Rules:**
*   Path sandbox: reject any path outside `workspace_root`
*   Max tool calls: 50 per task (hard limit → exit(1))
*   JSON retry: 3 attempts if Ollama response is malformed
*   No-tool detection: if LLM responds 3 consecutive turns without tool calls → exit(1)
*   Worker ID consistency: all notifications use the server-assigned `worker_id`

```
Server spawn → stdin: { worker_id, task_id, task_details, workspace_root }
                          │
                          ▼
                  Agent Runner Process (one-shot):
                    1. Read task + worker_id from stdin
                    2. Build prompt → Ollama /api/chat
                    3. LLM tool_calls → Runner executes locally (workspace ONLY)
                    4. Runner notifies server: complete_task(worker_id, summary)
                    5. exit(0) — process dies
```

### 3.7. Server TaskDispatchLoop — The Main Loop

The Server runs a continuous dispatch loop. Workers do NOT loop.

```
SERVER — TaskDispatchLoop (runs continuously):
  while (true):
    1. queue.getNextTask()
       → Has task? → continue to step 2
       → Empty?    → sleep 2s, check again

    2. stateManager.moveToActive(task.id)
       → Server moves file inbox/ → active/

    3. selectModelProfile(task)
       → Quality (1×9B) or Throughput (2×4B)

    4. spawnWorker({
         worker_id, task_id, task_details,    ← Server INJECTS
         model, workspace_root, server_url,
         allowed_tools
       })
       → Worker subprocess created, receives task via stdin

    5. Wait for worker exit OR timeout
       → Worker calls complete_task() → Server receives notification
       → Server moves active/ → outbox/
       → Worker process exits

    6. unloadModel() → ollama keep_alive:0 → free VRAM

    7. → Loop back to step 1
```

### 3.8. Error Handling for Local LLMs

Local LLMs fail differently from IDE agents. The architecture mitigates many risks:

| Error Type | Frequency | Mitigated? | Handling |
|---|---|---|---|
| Malformed JSON tool_calls | High (7-9B) | ❌ | Agent Runner retry 3× |
| Infinite loop (repeated tool calls) | Medium | ❌ | Max 50 tool calls + timeout |
| Refuses to use tools (chat only) | Medium | ❌ | Agent Runner detect + exit(1) |
| VRAM OOM crash | Low | ✅ Recovery | Server detect exit → requeue |
| **Hallucinate task IDs** | **Impossible** | ✅ IPC | Server injects task_id via stdin |
| **Hallucinate queue paths** | **Impossible** | ✅ Server-centric | Worker has NO access to queue dirs |
| Hallucinate workspace paths | Medium | ⚠️ Reduced | Path sandbox enforced by Runner |

---

## 4. Hardware Considerations & Dynamic Model Selection

### 4.1 Hardware Constraint

Target: **Nvidia RTX 5060 Ti 16GB VRAM**

### 4.2 Dynamic Model Selection Strategy

The Server automatically selects the optimal model configuration based on task characteristics:

```
Mode A — Quality (1 × Large model):
  Qwen 3.5 9B Q4_K_M:
    Model weights:      ~6.5 – 7 GB
    KV Cache (32K ctx): ~2 GB
    Framework overhead: ~0.5 GB
    ────────────────────
    Total:              ~9 GB (leaves ~7 GB headroom)

Mode B — Throughput (2 × Small model):
  Qwen 3.5 4B Q4_K_M (×2):
    Model weights:      ~3 GB × 2 = 6 GB
    KV Cache (16K ctx): ~0.8 GB × 2 = 1.6 GB
    Framework overhead: ~0.5 GB × 2 = 1 GB
    ────────────────────
    Total:              ~8.6 GB (leaves ~7 GB headroom)

  ⚠️ 2 × Qwen 9B Q4_K_M = 16 GB+ → ❌ OOM — never do this
```

| Mode | When | Workers | Model | VRAM/worker | Total | Context |
|---|---|---|---|---|---|---|
| **Quality** ⭐ | Short tasks, dependent, high accuracy needed | 1 | Qwen 3.5 **9B** Q4_K_M | ~9 GB | 9 GB | 32K |
| **Throughput** | Long tasks, standalone, parallelizable | 2 | Qwen 3.5 **4B** Q4_K_M | ~4 GB | 8 GB | 16K |

**Server auto-decision logic:**

```typescript
function selectModelProfile(task: TaskDef, queue: QueueState): ModelProfile {
  const isStandalone = task.dependencies?.length === 0;
  const pendingCount = queue.getStatus().pending;

  // Multiple standalone tasks waiting → 2 small workers for throughput
  if (isStandalone && pendingCount >= 3) {
    return MODEL_PROFILES.THROUGHPUT;  // 2 × Qwen 4B
  }

  // Complex task or has dependencies → 1 strong worker
  return MODEL_PROFILES.QUALITY;       // 1 × Qwen 9B
}
```

### 4.3 Recommended "Limb" Models (2026 Standards)

**Quality Tier (Single Worker):**
1.  **Qwen 3.5 9B (Instruct/Coder):** Unparalleled Function/Tool Calling strictness. 262K native context. Best choice for complex execution.
2.  **Llama 3.2/3.3 8B Instruct:** Highly disciplined in negative constraints. Strong alternative.
3.  **DeepSeek-Coder V-Series Distilled (7B-8B):** Strong analytical coding, less robust at schema-adherence.

**Light Tier (Parallel Workers):**
1.  **Qwen 3.5 4B Q4_K_M:** Best balance of size and tool-calling accuracy for parallel mode.
2.  **Llama 3.2 3B:** Minimal VRAM, suitable for simple standalone tasks.
3.  **Phi-4 Mini:** Microsoft's compact model with strong code capabilities.

> **Note:** Explicitly avoid running *Reasoning* or *Chain-of-Thought* variants (e.g., DeepThink / R1) for execution Workers. Their invisible logical preamble drastically increases TTFT and contradicts the requirement for fast mechanical execution.

---

## 5. Inference Engine — Ollama

**Selected engine: Ollama** — for the following reasons:

| Feature | Ollama |
|---|---|
| Setup | 1 command: `ollama pull qwen3.5:9b` |
| API | OpenAI-compatible REST |
| Tool/Function Calling | ✅ Native, mature |
| VRAM Control | ✅ `keep_alive: 0` = instant unload after response |
| Programmatic Load/Unload | ✅ API: `POST /api/generate { keep_alive: 0 }` |
| Multi-model concurrent | ✅ `OLLAMA_MAX_LOADED_MODELS` env var |
| Node.js SDK | ✅ `ollama` npm package |
| Context Size Control | ✅ `num_ctx` param per-request |
| Token Usage Tracking | ✅ `prompt_eval_count` + `eval_count` in response |

**VRAM Lifecycle:**
```
1. LOAD:  Automatic on first /api/chat call → model weights loaded into VRAM
2. KEEP:  keep_alive: 0 → unload IMMEDIATELY after response
3. UNLOAD: POST /api/generate { model, prompt:"", keep_alive: 0 }
           OR: ollama stop <model>
4. VERIFY: ollama ps → see loaded models | nvidia-smi → see actual VRAM
```

**Why NOT Docker:** Ollama is already a daemon process managing model isolation. Workers are just Node.js scripts calling Ollama API. Docker adds ~200-500MB overhead, complex GPU passthrough, and slow cold-starts. `child_process.spawn` is zero-overhead and instant.

---

## 6. Server Operation Profiles (Modes)

To ensure backward compatibility with Phase 1 (IDE agent as persistent worker):

### Profile 1: Default Mode (Single IDE / Antigravity)

*   **Role Management:** Blurred. IDE agent acts as both Planner and Worker.
*   **Timeouts:** Forgiving (`STALE_THRESHOLD_MS` = 30 minutes). Accounts for Human-in-the-Loop delays.
*   **Worker Type:** Persistent IDE connection. No auto-kill on idle.

### Profile 2: Hybrid Mode (IDE Planner + Local Workers)

*   **Role Management:** Strict separation. IDE = Planner (Head) only. LLM = Worker (Limb) only.
*   **Timeouts:** Ruthless (`STALE_THRESHOLD_MS` = 15 seconds). Auto-kill stale workers.
*   **Worker Type:** Ephemeral subprocesses. One-shot execution.

```typescript
export const SERVER_PROFILES = {
  DEFAULT: {
    staleThresholdMs: 30 * 60_000,    // 30 minutes
    autoKillWorker: false,
    workerType: 'IDE',                // persistent
    maxConcurrentWorkers: 1,
    roleManagement: 'blurred',
  },
  HYBRID: {
    staleThresholdMs: 15_000,         // 15 seconds
    autoKillWorker: true,
    workerType: 'LOCAL_LLM',          // ephemeral
    maxConcurrentWorkers: 1,          // 1 for 9B, 2 for 4B
    roleManagement: 'strict',
  }
} as const;
```

**Startup prompt integration:**
```
? Server profile (default/hybrid) [default]: hybrid
? LLM engine [ollama]:
? Model name [qwen3.5:9b-q4_k_m]:
? Max concurrent workers [1]:
```

---

## 7. Worker Kill & Restart Strategy (Server-Controlled)

### Kill Flow — Server decides, worker NEVER self-kills:

```
Stage 1 — Graceful:
  Server sends SIGTERM → Agent Runner process
    → Runner tries: notifyServer(status: 'blocked', summary: 'preempted')
    → Exit process
    → Server detects exit → moves task active/ → inbox/ (requeue)
    → Server calls Ollama: keep_alive: 0 → free VRAM

Stage 2 — Force (3s timeout from Stage 1):
  Server calls child.kill('SIGKILL')
    → Agent Runner dies immediately
    → Server: ollama stop <model> → force VRAM unload
    → Server requeues task

Stage 3 — Nuclear:
  execSync('kill -9 <pid>')
  execSync('ollama stop <model>')
  Server cleans up worker registry
```

### No "Restart" Concept:

Workers are one-shot. There is no restart. The TaskDispatchLoop continuously spawns **new** workers:

```
worker:exit event fires
  ↓
Server checks: was complete_task() called?
  → YES (code 0): Task done, outbox/ has result
  → NO (crash/timeout): Server requeues task → inbox/
  ↓
Server checks pending queue
  → Has task? → spawnWorker(nextTask)  // spawn NEW worker
  → Empty?    → sleep 2s, check again
```

---

## 8. Expected Phase 2 Workflow Lifecycle

1. **Plan Generation:** A `pending plan` is fed to the Head (Claude / Antigravity). The Head parses requirements and decomposes into explicit task definitions, placed in `plan/pending/`.
2. **Server-Controlled Dispatch:** The Server's `TaskDispatchLoop` reads tasks from the queue, selects model profile, and **pushes** task data directly into spawned workers via `stdin`. Workers NEVER call `get_next_task()`. Workers NEVER read queue files.
3. **Blind Execution:** Each Worker receives exactly 1 task, executes code changes in `workspace_root`, generates a Changelog, calls `complete_task(worker_id, summary)` to notify the Server, and exits.
4. **Phase-Level Review:** Once all tasks in a phase are complete, the Head evaluates the aggregate codebase (not each micro-task individually).
5. **Correction Loop:** The Head or Local Workers rectify any discrepancies flagged during review.
6. **Human Validation:** The Human-in-the-Loop conducts manual system review and visual testing.
7. **Final CI/CD Build:** Upon Human approval, the Build Engineer executes build tools, resolves dependencies, and publishes.

---

## 9. New Modules Required

### Server-Side (runs in Orchestrator process)

| Module | Path | Responsibility |
|---|---|---|
| `TaskDispatchLoop` | `src/worker/dispatch-loop.ts` | **Main loop**: check queue → spawn worker → wait → loop |
| `WorkerProcessManager` | `src/worker/process-manager.ts` | Spawn/kill/timeout worker subprocesses via `child_process.spawn` |
| `ModelSelector` | `src/worker/model-selector.ts` | Dynamic Quality/Throughput mode selection based on task + VRAM |
| `OllamaClient` | `src/worker/ollama-client.ts` | Ollama API wrapper (load/unload/chat/ps/health) |

### Worker-Side (runs in subprocess — ephemeral, one-shot)

| Module | Path | Responsibility |
|---|---|---|
| `AgentRunner` | `src/worker/agent-runner.ts` | **One-shot executor**: stdin → LLM → tools → notify → exit |
| `ToolExecutor` | `src/worker/tool-executor.ts` | Local file I/O on workspace (path-sandboxed) |
| `TokenCounter` | `src/worker/token-counter.ts` | Track cumulative token usage, trigger checkpoint at 80% |

---

## 10. Health Monitoring Stack

```
Layer 1 — Process Status (event-driven):
  WorkerProcessManager tracks child.pid
  child.on('exit') → detect crash/completion
  No polling needed

Layer 2 — Ollama Status (every 30s):
  GET http://localhost:11434/api/tags → Ollama alive?
  ollama ps (via execSync) → which models loaded? VRAM?

Layer 3 — GPU Monitor (every 30s):
  nvidia-smi --query-gpu=memory.used,memory.total
  Alert if VRAM > 90% capacity

Layer 4 — Task Timeout (per-task):
  Hard timeout: 5 minutes
  Server kills worker if exceeded → requeues task
```
