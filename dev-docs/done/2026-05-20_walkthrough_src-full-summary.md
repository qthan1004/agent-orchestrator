# `src/` — Full Source Code Summary

> **Project**: agent-orchestrator v0.3.0-dev (Phase 2 — Hybrid Agentic Architecture)
> **Stack**: Node.js, TypeScript, Pure ESM
> **Total files**: 37 source files across 5 subdirectories

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  src/index.ts (Entry Point)                                 │
│    ↓                                                        │
│  src/config.ts → loads AppConfig                            │
│    ↓                                                        │
│  src/mcp-server/index.ts (Server Bootstrap)                 │
│    ├── transport.ts (HTTP + MCP sessions)                   │
│    ├── server.ts (McpServer factory)                        │
│    ├── tools.ts (16 MCP tools registered)                   │
│    ├── state-manager.ts (plan/task state machine)           │
│    ├── task-queue.ts (DAG-aware priority queue)             │
│    ├── recovery.ts (crash recovery + stale detection)       │
│    └── plan-watcher.ts (auto-poll plans)                    │
│                                                             │
│  src/worker/ (Hybrid Dispatch Subsystem)                    │
│    ├── dispatch-loop.ts (auto-assign tasks → workers)       │
│    ├── agent-runner.ts (one-shot LLM agent process)         │
│    ├── process-manager.ts (spawn/kill child processes)      │
│    ├── model-selector.ts (quality vs throughput)             │
│    ├── vram-manager.ts (GPU monitoring)                     │
│    ├── tool-executor.ts (sandboxed tool execution)          │
│    ├── prompt-builder.ts (system prompt assembly)           │
│    ├── token-counter.ts (context window tracking)           │
│    ├── git-worktree.ts (branch isolation)                   │
│    └── adapters/ (Ollama + Gemini LLM adapters)             │
│                                                             │
│  src/models/ (TypeScript interfaces & Zod schemas)          │
│  src/utils/ (file I/O, logging, registries, bootstrap)      │
│  src/constants.ts (all enums, magic strings, defaults)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Root Files (`src/`)

### `src/index.ts` — Entry Point
| | |
|---|---|
| **Purpose** | CLI entry — parses args, prompts config, starts server |
| **In** | `process.argv` (CLI flags: `serve`, `--port`) |
| **Out** | Calls `startServer(config)` → HTTP server on port 3847 |
| **Key flow** | `promptConfig()` → `loadConfig(overrides)` → `startServer(config)` |

### `src/config.ts` — Configuration Loader
| | |
|---|---|
| **Purpose** | Builds the full `AppConfig` object from overrides + defaults |
| **In** | `ConfigOverrides` (port, host, workspaceRoot, polling intervals, etc.) |
| **Out** | `AppConfig` with all resolved paths (exchange, plans, tasks, memory) |
| **Key logic** | Requires explicit `workspaceRoot` (no implicit discovery). Derives `workspaceId` via SHA-256 hash. Builds workspace-scoped + global memory paths. |
| **Export** | `loadConfig(overrides): AppConfig` |

### `src/constants.ts` — All Constants & Enums
| | |
|---|---|
| **Purpose** | Single source of truth for all string literals, enums, defaults, system messages |
| **Exports** | `VERSION`, `TOOL_NAMES` (16 tools), `WORKER_STATUS`, `TASK_STATUS`, `STATE_EVENTS`, `RECOVERY_EVENTS`, `SERVER_PROFILES`, `POLL_DEFAULTS`, `RECOVERY_DEFAULTS`, `SYSTEM_MESSAGE` (50+ templated log messages), `WORKER_ROLE`, `AGENT_ACTION`, `DIR_NAMES`, `FILE_PREFIXES`, `PROCESS_SIGNALS`, `SHUTDOWN_SIGNALS` |

---

## 2. Models (`src/models/`)

### `index.ts` — Barrel Export
Re-exports all model types from the 10 sibling files.

### `config.ts` — Configuration Types
| Type | Fields |
|---|---|
| `AppConfig` | `root`, `runtimeRoot`, `profile`, `global: GlobalConfig`, `workspace: WorkspaceConfig` |
| `GlobalConfig` | `server` (port/host), `polling`, `recovery`, `templates`, `sharedMemory` |
| `WorkspaceConfig` | `workspaceId`, `workspaceRoot`, `exchange` (inbox/active/outbox/checkpoints/logs/signals), `plans`, `tasks`, `planWatcher`, `memory` |
| `ConfigOverrides` | All optional overrides for startup prompt / CLI |

### `assignment.ts` — Assignment-First Contract
| | |
|---|---|
| **Purpose** | Defines the orchestrator-owns-assignment protocol |
| **Key types** | `AssignmentPayload`, `AssignmentEnvelope`, `RegisterWorkerRequest/Response`, `CompleteTaskRequest`, `WorkspaceScopedContext`, `DispatchRoutingMetadata` |
| **Key constants** | `ASSIGNMENT_CONTRACT_MODE = "assignment-first"`, `ASSIGNMENT_STATE` (registered→assigned→acknowledged→in_progress→completed/failed/blocked), `ASSIGNMENT_CANONICAL_CONTRACT` |

### `task.ts` — Task Definition
| Type | Fields |
|---|---|
| `TaskDef` | `id`, `module`, `action`, `verification`, `status?`, `retry_count?` |
| `TaskResult` | `task_id`, `status`, `summary`, `worker_id`, `completed_at` |
| `TaskGroup` | `group_id`, `tasks[]`, `depends_on?[]` |
| `TaskGraph` | `groups: TaskGroup[]` |

### `task-metadata.ts` — Extended Task Metadata + Parser
| | |
|---|---|
| **Purpose** | Parses task markdown files with YAML frontmatter into `TaskMetadata` |
| **In** | `ParseTaskMetadataInput` (`content`, `workspace_id`, `task_content_path`, `submitted_task_id`) |
| **Out** | `TaskMetadata` (extends `TaskDef` with `workspace_id`, `priority`, `depends_on[]`, `target_files[]`, `read_files[]`, `description`, timestamps) |
| **Export** | `parseTaskMetadata(input): TaskMetadata` |
| **Logic** | Extracts YAML frontmatter (`---`), validates `task_id` + `action`, parses arrays (inline `[]` or YAML list `-`), body becomes `description` |

### `worker.ts` — Worker Info
`WorkerInfo`: `id`, `role`, `registered_at`, `last_heartbeat`, `current_task`, `tasks_completed`, `status`, `disconnected_at?`

### `checkpoint.ts` — Checkpoint Schema
| Type | Fields |
|---|---|
| `UnifiedCheckpoint` | `task_id`, `phase` (pre-flight/implementation/verification/done), `files_changed[]`, `completed_steps[]`, `remaining_steps[]`, `error_context?`, `token_usage?` |
| `CheckpointErrorContext` | `error`, `hypothesis`, `attempted_fix` |

### `context.ts` — Server DI Context
`ServerContext`: `stateManager`, `logger`, `config`, `workerRegistry`, `recoveryManager?`, `planWatcher?`

### `plan.ts` — Plan Types
`PlanCheckResult` (status: ready/busy/idle, current, plan_path, content, pending_count), `PlanQuickStatus`

### `mcp.ts` — MCP Response Types
`ToolResponse` (`content[]`, `isError?`), `ToolResponseContent` (`type`, `text`)

### `bootstrap.ts` — Bootstrap Result
`BootstrapResult`: `created[]`, `failed[]`, `skipped: number`

---

## 3. MCP Server (`src/mcp-server/`)

### `index.ts` — Server Bootstrap (Main Orchestration)
| | |
|---|---|
| **Purpose** | Complete server startup sequence — the "main()" of the application |
| **In** | `AppConfig` |
| **Out** | Running Express HTTP server with MCP + REST endpoints |
| **Startup sequence** | 1) `bootstrapDirectories` → 2) Register primary workspace → 3) Init Logger + WorkerRegistry → 4) `RecoveryManager.runStartupRecovery()` → 5) `PlanWatcher.start()` → 6) `ensureOllamaRunning()` → 7) Init Hybrid components (ModelSelector, ProcessManager, VramManager, DispatchLoop) → 8) Express app with middleware → 9) MCP routes → 10) Graceful shutdown handlers |
| **REST endpoints** | `GET /health` (full system health), `POST /api/worker/complete` (worker result callback), `GET/POST/DELETE /mcp` (MCP protocol) |
| **Shutdown flow** | Stop PlanWatcher → Clear workers → Stop DispatchLoop → Kill active processes → Unload Ollama models → Stop VRAM monitoring → RecoveryManager graceful shutdown → Close transports → Exit |

### `server.ts` — MCP Server Factory
| | |
|---|---|
| **In** | `ServerContext` |
| **Out** | `McpServer` instance with all tools registered |
| **Logic** | Creates `McpServer` (name: "orchestrator", version from constants), calls `registerTools()` |

### `transport.ts` — Streamable HTTP Transport
| | |
|---|---|
| **Purpose** | Manages MCP sessions over HTTP (Streamable HTTP spec) |
| **In** | Express app + ServerContext |
| **Out** | `McpTransports` map (sessionId → transport) |
| **Routes** | `GET /mcp` (SSE stream), `POST /mcp` (new session or existing), `DELETE /mcp` (close session) |
| **Session mgmt** | Auto-creates new `StreamableHTTPServerTransport` on init request, cleans up on close |

### `tools.ts` — 16 MCP Tools (837 lines)
| Tool Name | Purpose | Key In/Out |
|---|---|---|
| `hello_world` | Health check | In: `name` → Out: greeting |
| `register_worker` | Register new worker | In: `workspace_path` → Out: `worker_id`, `workspace_id`, `queue_summary` |
| `submit_task` | Register planner task file | In: `task_id`, `workspace_id`, `task_content_path` → Out: registration status |
| `complete_task` | Complete assigned task | In: `task_id`, `status`, `summary`, `worker_id` → Out: `accepted`, `next_action` |
| `report_progress` | Progress update + heartbeat | In: `task_id`, `step`, `percentage`, `worker_id` → Out: "ok" |
| `get_status` | Server version/uptime | Out: version, uptime, transport, connected_workers |
| `get_queue_status` | Queue counts | Out: total/pending/active/done/failed/blocked |
| `get_checkpoint` | Save + return checkpoint path | Out: checkpoint file path |
| `submit_decomposition` | Submit plan → tasks + DAG | In: `tasks[]`, `graph`, `reasoning`, `source_plan` → Out: tasks_created |
| `request_retry` | Requeue failed task | In: `task_id`, `reason`, `attempt` → Out: approved, retry_count |
| `force_release_task` | Force-release stuck task | In: `task_id`, `reason` → Out: released status |
| `get_template` | Fetch prompt template | In: `template_name` → Out: template content |
| `ping` | Keepalive heartbeat | In: `worker_id` → Out: "alive" |
| `scan_workspace` | Generate workspace-memory.md | In: `force_update` → Out: scan stats |
| `session_checkpoint` | Save/load/clear session | In: `action`, checkpoint fields → Out: status + data |
| `close_workspace` | Detach workspace | In: `workspace_id` → Out: closed status |
| `reopen_workspace` | Reactivate workspace | In: `workspace_id` → Out: reopened status |

**Middleware**: `withHeartbeat()` — auto-updates worker heartbeat on every tool call with `worker_id`.

### `state-manager.ts` — State Machine (496 lines)
| | |
|---|---|
| **Purpose** | Owns all plan/task state transitions + file-based persistence |
| **In** | `WorkspaceConfig`, `Logger` |
| **State** | `queue: TaskQueue`, `plan: PlanMeta | null` |
| **Plan flow** | `checkPlans()`: pending/ → processing/ → `completePlan()` → done/ |
| **Task flow** | `storeTasks()` → inbox/ → `moveToActive()` → active/ → `moveToOutbox()` → outbox/ |
| **Recovery** | `restoreFromFiles()`: rebuilds queue from inbox/active/outbox JSON files, auto-recovers FAILED tasks (< maxRetries) |
| **Checkpointing** | `saveCheckpoint()`: writes queue snapshot to checkpoints/, rotates to keep max 10 |
| **Retry** | `requeueWithRetry()`: increments retry_count on disk, attaches error_context from session.json |

### `task-queue.ts` — DAG-Aware Priority Queue (277 lines)
| | |
|---|---|
| **Purpose** | In-memory task queue with dependency graph, priority sorting, file-conflict detection |
| **Key methods** | |
| `validateDAG(graph)` | Cycle detection via DFS |
| `loadFromGraph(tasks, graph)` | Load tasks + groups from decomposition |
| `registerTaskMetadata(task)` | Register single task from submit_task |
| `getUnlockedTasks()` | Find tasks whose group dependencies are all DONE |
| `canDispatch(task)` | Check deps resolved + no file conflicts with active tasks |
| `getDispatchableTasks()` | Unlocked + dispatchable, sorted by priority → file count → created_at |
| `getNextTask()` | Top dispatchable task |
| `pruneCompletedGroups()` | GC: remove groups where all tasks DONE/FAILED |
| `serialize()` | Export graph + tasks for checkpoint |

### `recovery.ts` — Crash Recovery Manager (390 lines)
| | |
|---|---|
| **Purpose** | Handles startup recovery, stale worker detection, orphan task requeuing |
| **Startup flow** | 1) Check shutdown marker → 2) If unclean: restore state + detect orphans → 3) Start monitoring → 4) Clear marker |
| **Runtime monitoring** | Every 5s: check stale workers (heartbeat > threshold) + scan outbox for FAILED tasks |
| **Stale handling** | Race-condition guard: checks `isTaskInActive()` before requeue (prevents double-move with `complete_task`) |
| **Shutdown marker** | `.shutdown_clean` file at `runtimeRoot` — presence = last shutdown was clean |

### `plan-watcher.ts` — Auto Plan Polling (214 lines)
| | |
|---|---|
| **Purpose** | Polls workspace `.agent/plans/pending/` directories on interval |
| **In** | `StateManager`, `Logger`, `WorkspaceRegistry`, `intervalMs` (default 30s) |
| **Logic** | Scans all registered workspaces → picks oldest .md file → copies to runtime processing dir + moves to workspace processing dir |
| **Stats** | `getStats()`: totalPolls, plansDetected, lastPollAt, running status |

### `tools/scan-workspace.ts` — Workspace Scanner (412 lines)
| | |
|---|---|
| **Purpose** | Generates `.agent/workspace-memory.md` with file map, dependency graph, git co-change analysis |
| **In** | `rootDir`, `forceUpdate` |
| **Out** | `ScanResult` (status: generated/cached, stats) |
| **Logic** | 1) Scan directory tree (max 500 files, ignores node_modules/.git/dist) → 2) Parse TS/JS imports for dependency graph → 3) `git log` analysis for co-changing file pairs → 4) Generate markdown report |

### `tools/session-checkpoint.ts` — Session Checkpoint (177 lines)
| | |
|---|---|
| **Purpose** | Save/load/clear `.agent/session.json` for agent resume across sessions |
| **Schema** | `UnifiedCheckpoint v3`: task_id, phase, files_changed, completed_steps, remaining_steps, error_context, token_usage |
| **Migration** | Auto-migrates v1 (legacy) and v2 sessions to v3 format on load |
| **In** | `SessionCheckpointInput` (action: save/load/clear + checkpoint fields) |
| **Out** | `{ status: saved/loaded/no_session/cleared, data?, file? }` |

---

## 4. Utils (`src/utils/`)

### `bootstrap.ts` — Directory Bootstrapper
| Function | In | Out | Purpose |
|---|---|---|---|
| `bootstrapDirectories(config)` | `AppConfig` | `BootstrapResult` | Creates global dirs: runtimeRoot, logs, workspaces, templates |
| `bootstrapWorkspace(runtimeRoot, workspaceId)` | root + id | `BootstrapResult` | Creates per-workspace dirs: exchange/*, memory/*, queue.json |

### `file-backend.ts` — File I/O Abstraction (157 lines)
| Function | In → Out | Purpose |
|---|---|---|
| `ensureDir(path)` | string → boolean | `mkdirSync` recursive |
| `atomicWrite(path, content)` | string, string → boolean | Write to .tmp then rename |
| `readJSON<T>(path)` | string → T\|null | Parse JSON file |
| `readFile(path)` | string → string\|null | Read text file |
| `writeJSON(path, data)` | string, any → boolean | Atomic JSON write |
| `moveFile(from, to)` | string, string → boolean | Atomic rename |
| `copyFile(from, to)` | string, string → boolean | Copy with ensureDir |
| `listFiles(dir, ext?)` | string, string? → string[] | List files, optional ext filter |
| `deleteFile(path)` | string → boolean | Delete file |

### `logger.ts` — Daily Markdown Logger
| | |
|---|---|
| **Purpose** | Appends structured events to daily log files (YYYY-MM-DD.md) |
| **In** | `event: string`, `data: Record<string, any>` |
| **Out** | Appends `## HH:MM:SS — EVENT` + key-value entries to log file |

### `ollama-launcher.ts` — Ollama Auto-Starter
| | |
|---|---|
| **Purpose** | Ensures Ollama is running at startup; auto-spawns `ollama serve` if not |
| **In** | `baseUrl` (default `http://localhost:11434`) |
| **Out** | `boolean` (ready or not) |
| **Logic** | Health check → if down, spawn detached process → poll health every 500ms up to 15s timeout |

### `startup-prompt.ts` — Interactive Config Prompt
| | |
|---|---|
| **Purpose** | CLI prompt for workspace root, port, plan watcher interval |
| **In** | stdin (interactive readline) |
| **Out** | `ConfigOverrides` |
| **Modes** | `default` (uses cwd as workspace, port 3847) or `custom` (all fields prompted) |
| **Guard** | `workspaceRoot` is mandatory — exits if empty |

### `worker-registry.ts` — Worker Lifecycle Registry
| | |
|---|---|
| **Purpose** | Manages worker state: registration, heartbeats, task assignments, disconnect/reconnect |
| **Storage** | In-memory `Map<string, WorkerInfo>` + persisted to `workers.json` |
| **Key methods** | `register()`, `assignTask()`, `clearAssignment()`, `markDisconnected()`, `cleanupDisconnected()`, `updateHeartbeat()`, `getActivePlanner()` |
| **Singleton** | Exports `workerRegistry` instance (path set later via `setRegistryPath`) |

### `workspace-registry.ts` — Workspace Lifecycle Registry
| | |
|---|---|
| **Purpose** | Register, close, reopen workspaces with deterministic IDs |
| **ID generation** | `SHA-256(absolutePath).substring(0, 8)` — deterministic 8-char hex |
| **Storage** | `workspaces.json` at runtimeRoot |
| **Lifecycle** | `register()` → active, `close()` → closed (preserves runtime state), `reopen()` → active (validates path still exists) |

---

## 5. Worker Subsystem (`src/worker/`)

### `dispatch-loop.ts` — Task Dispatch Loop (196 lines)
| | |
|---|---|
| **Purpose** | Continuous loop: picks dispatchable tasks → spawns worker processes → handles exit/timeout |
| **In** | `DispatchLoopConfig` (queue, stateManager, workerRegistry, serverUrl, workspaceRoot, etc.) |
| **Loop cycle** | 1) `queue.getDispatchableTasks()` → 2) `stateManager.moveToActive()` → 3) `modelSelector.selectProfile()` → 4) Build `AssignmentEnvelope` → 5) `processManager.spawn()` → 6) Wait for exit/timeout → 7) Handle result → 8) `ollamaAdapter.unload()` |
| **Error handling** | Timeout or non-zero exit → requeue task with retry. Exit 0 → task already completed via HTTP callback. |

### `agent-runner.ts` — One-Shot LLM Agent (306 lines)
| | |
|---|---|
| **Purpose** | Standalone process: reads task from stdin → runs LLM tool-call loop → notifies server on completion |
| **In** | `WorkerPayload` via stdin JSON (worker_id, task_id, task_details, assignment, target_files, model, etc.) |
| **Out** | HTTP POST to `/api/worker/complete` with result |
| **LLM loop** | System prompt + task → LLM response → execute tool calls → feed results back → repeat (max 50 iterations) |
| **Safety guards** | 3× no-tool-calls → abort, 3× malformed JSON → abort, 2× reflexion failures → abort, scope violation → immediate abort, token checkpoint at 80% usage |
| **Tools available** | All `allowed_tools` + built-in `complete_task` |

### `process-manager.ts` — Worker Process Manager (180 lines)
| | |
|---|---|
| **Purpose** | Spawns worker processes, manages lifecycle, auto-kill on timeout |
| **In** | `WorkerPayload` + `SpawnOptions` (timeoutMs default 5min, scriptPath) |
| **Out** | Events: `worker:exit`, `worker:timeout` |
| **Spawn flow** | `node agent-runner.js` → pipe payload to stdin → forward stdout/stderr to server console |
| **Kill cascade** | SIGTERM → 3s → SIGKILL → 3s → platform-specific nuclear kill |

### `model-selector.ts` — LLM Model Selection (89 lines)
| | |
|---|---|
| **Purpose** | Picks quality vs throughput model profile based on task + queue state |
| **In** | `TaskDef`, `TaskQueueStatus` |
| **Out** | `ModelProfile` (mode, model, num_ctx, max_workers, estimated_vram_gb) |
| **Logic** | Standalone task + ≥3 pending → **throughput** (2× 4B model, 16K ctx). Otherwise → **quality** (1× 9B model, 32K ctx) |
| **VRAM check** | Uses `nvidia-smi` to warn if free VRAM < required |

### `vram-manager.ts` — GPU VRAM Monitor (116 lines)
| | |
|---|---|
| **Purpose** | Periodic GPU health monitoring via `nvidia-smi` + Ollama API |
| **Key methods** | `checkVram()` → `VramStatus` (used_mb, total_mb, percentage), `canSpawn(profile)` → boolean, `unloadAfterUse(model)` |
| **Monitoring** | Every 30s: check Ollama alive, list loaded models, check VRAM, alert if >90% |

### `tool-executor.ts` — Sandboxed Tool Execution (188 lines)
| | |
|---|---|
| **Purpose** | Executes tools within workspace sandbox with scope enforcement |
| **In** | `toolName`, `args: Record<string, unknown>` |
| **Out** | `ToolResult` (`output?`, `error?`) |
| **Tools** | `view_file`, `list_dir`, `write_to_file`, `replace_file_content`, `run_command` |
| **Security** | Path sandbox (all paths resolved relative to workspaceRoot), symlink check, `SCOPE_VIOLATION` if writing outside `target_files`, max 50 calls per session |

### `prompt-builder.ts` — System Prompt Assembly (56 lines)
| | |
|---|---|
| **Purpose** | Builds LLM system prompt from base template + action-specific skill |
| **In** | `PromptTask` (id, action, module, workspaceRoot) |
| **Out** | Combined prompt string with template variables replaced |
| **Template files** | `prompts/workers/base-worker.md` + `prompts/workers/skill-{action}.md` |

### `token-counter.ts` — Context Window Tracker (40 lines)
| | |
|---|---|
| **Purpose** | Tracks cumulative token usage, signals checkpoint at 80% of context limit |
| **In** | `contextLimit` (default 8192) |
| **Methods** | `addUsage(prompt, completion)`, `shouldCheckpoint()` → boolean, `getUsage()` → {used, limit, percentage} |

### `git-worktree.ts` — Git Worktree Manager (86 lines)
| | |
|---|---|
| **Purpose** | Creates/removes/lists git worktrees for branch isolation during parallel work |
| **Methods** | `create(root, branch)` → worktree path, `remove(root, path)`, `list(root)` → paths[] |
| **Location** | Worktrees created in OS temp dir under `agent-orchestrator-worktrees/` |

### `adapters/llm-adapter.ts` — LLM Adapter Interface
| | |
|---|---|
| **Purpose** | Defines the universal LLM interface for all adapters |
| **Exports** | `LLMAdapter` interface (`health()`, `chat()`), `ChatMessage`, `ChatRequest`, `ChatResponse`, `ToolDefinition`, `ToolCall`, `TokenUsage`, `ChatRole` enum |

### `adapters/index.ts` — Adapter Factory
| | |
|---|---|
| **Purpose** | Factory function to create adapters by name |
| **Export** | `createAdapter({ adapter: 'ollama' | 'gemini', baseUrl?, apiKey? }): LLMAdapter` |

### `adapters/ollama-adapter.ts` — Ollama LLM Adapter (137 lines)
| | |
|---|---|
| **Purpose** | Implements `LLMAdapter` for local Ollama API |
| **Endpoint** | `POST /api/chat` (non-streaming) |
| **Extra methods** | `listModels()`, `ps()` (loaded models), `unload(model)` (free VRAM via keep_alive=0) |
| **Error handling** | Timeout, connection refused, malformed JSON detection |

### `adapters/gemini-adapter.ts` — Google Gemini Adapter (193 lines)
| | |
|---|---|
| **Purpose** | Implements `LLMAdapter` for Google Gemini API |
| **Endpoint** | `POST /v1beta/models/{model}:generateContent` |
| **Auth** | API key via constructor or `GEMINI_API_KEY` env var |
| **Message mapping** | Translates ChatMessage roles → Gemini format (user/model/function), handles tool_calls ↔ functionCall |

---

## Data Flow Summary

```
User drops plan.md into workspace/.agent/plans/pending/
    ↓
PlanWatcher detects → moves to processing/
    ↓
Planner agent calls submit_decomposition → tasks stored in inbox/ + DAG in _queue.json
    ↓
DispatchLoop polls queue.getDispatchableTasks()
    ↓
moveToActive() → build AssignmentEnvelope → spawn agent-runner.ts subprocess
    ↓
agent-runner: stdin payload → LLM chat loop → tool calls (view_file, write_to_file, etc.)
    ↓
complete_task tool → HTTP POST /api/worker/complete
    ↓
moveToOutbox() + result JSON → worker cleared → model unloaded from VRAM
    ↓
Loop continues with next dispatchable task
```
