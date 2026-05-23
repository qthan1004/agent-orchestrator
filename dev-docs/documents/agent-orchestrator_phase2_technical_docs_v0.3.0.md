# Agent Orchestrator - Technical Docs Phase 2 v0.3.0

> Ngay cap nhat: 2026-05-23
> Pham vi: code hien tai trong `src/` va cac tai lieu Phase 2 lien quan
> Trang thai: technical reference cho Phase 2 runtime-lease/harness architecture
> Luu y: tai lieu nay mo ta hien trang code, khong phai kich ban test.

## 1. Tom tat Phase 2

Phase 2 chuyen Agent Orchestrator tu kieu "worker tu boc task" sang kieu **server dieu phoi runtime lease**:

```text
Planner tao task
-> Server lock task va tao runtime lease
-> Server spawn Harness cho dung task attempt
-> Harness chay model/tool loop
-> Harness callback ready/progress/complete ve Server
-> Server validate lease roi moi mutate task state
```

Y tuong cot loi:

- **Server** la coordinator: quan ly workspace, registry, queue, task state, runtime lease, recovery.
- **Planner** la noi co "brain": doc yeu cau, chia task, chon chien luoc.
- **Worker** trong Phase 2 thuc chat la **Harness instance** duoc server spawn cho mot task attempt.
- **Backend runtime** la model/CLI/API phia sau Harness: `ollama`, `codex-cli`, `ag-cli`.
- **RuntimeLease** la bang chung quyen so huu mot lan thuc thi task.
- **Model/CLI khong noi chuyen truc tiep voi server**. Chi Harness gui ready/progress/complete callback.

## 2. Core invariant

Invariant quan trong nhat:

```text
1 active task attempt
-> 1 runtime lease
-> 1 worker/harness instance
-> 1 backend runtime/session handle
-> 1 heartbeat record
-> 1 point reservation
```

Moi tin hieu co kha nang thay doi task state phai mang du:

```text
task_id
worker_id
runtime_id
lease_generation
backend
backend_session_id neu co
```

Neu callback khong match active lease thi server phai reject truoc khi mutate file trong `active/`, `outbox/`, `tasks.json`, `workers.json`.

`runtime_id` hien duoc tao theo cong thuc:

```text
<worker_id>:<task_id>:<lease_generation>
```

`lease_generation` hien duoc tinh trong `TaskDispatchLoop.getLeaseGeneration(task)`:

```text
max(task.retry_count, task.respawn_count) + 1
```

## 3. Doctrine layer

| Layer | Duoc lam | Khong duoc lam |
|---|---|---|
| Planner | Hieu user intent, chia task, chon strategy, de xuat knowledge | Ghi truc tiep queue internals |
| Server | Quan ly identity, registry, queue, dispatch, lease, callback, recovery | Doc private file de suy luan strategy, goi LLM |
| Harness | Load task duoc assign, expose tools, enforce sandbox, chay model loop, callback server | Tu pick task, decompose plan, mo rong scope |
| Backend model/CLI | Sinh output/lenh qua Harness | Goi server API/MCP tool truc tiep |
| Workspace `.orchestrator` | Luu state ro rang tren disk | Lam hidden memory tu dong |

Canonical sentence:

```text
Task owns work.
RuntimeLease owns execution right.
Worker equals Harness instance.
RuntimeService exists only while that lease is active.
Harness owns server protocol.
BackendAdapter owns model/CLI mechanics.
```

## 4. Thu muc runtime

Server bat buoc co `workspaceRoot`. Runtime state chinh nam trong workspace:

```text
<workspace>/.orchestrator/
  registry/
    workspace.json
    planners.json
    workers.json
    tasks.json
  planner/
    preflight.md
    workflows/
      create-plan.md
      create-tasks.md
  exchange/
    inbox/
    active/
    outbox/
    checkpoints/
    logs/
    signals/
    _queue.json
  plans/
    pending/
    processing/
    done/
  skills/
  context/
  results/
```

Y nghia:

- `plans/pending`: user/planner dat plan markdown vao day.
- `plans/processing`: plan dang duoc xu ly; system chi pick mot file cu nhat theo ten.
- `plans/done`: plan da submit decomposition xong.
- `exchange/inbox`: task JSON dang cho dispatch.
- `exchange/active`: task JSON dang duoc harness xu ly.
- `exchange/outbox`: task da terminal, kem `result-<task_id>.json`.
- `exchange/checkpoints`: queue snapshot, rotate giu 10 file moi nhat.
- `exchange/logs`: daily markdown logs.
- `exchange/signals`: recovery signals.
- `registry/workspace.json`: metadata workspace.
- `registry/planners.json`: planner identity registry, rieng voi worker.
- `registry/workers.json`: worker/harness registry.
- `registry/tasks.json`: task identity registry, khong chua task body.
- `planner/preflight.md`: preflight server nap cho planner khi `register_planner`.
- `planner/workflows/*`: workflow copy tu `reference/planner-workflows`.
- `skills/`, `context/`: file tinh duoc Harness load khi task khai bao.
- `results/`: result sync cho workspace.

## 5. Luong du lieu chinh

### 5.1 Startup

```text
src/index.ts
-> promptConfig()
-> loadConfig(overrides)
-> startServer(config)
-> bootstrapDirectories(config)
-> WorkspaceRegistry.register(workspaceRoot)
-> bootstrapWorkspace(workspaceRoot)
-> StateManager + RecoveryManager + PlanWatcher
-> ensureOllamaRunning()
-> CapacityStore + InfraVerifier + TaskDispatchLoop + InfraResourceMonitor
-> Express /health + /mcp + /api/worker/*
```

### 5.2 Plan -> task

```text
User/Planner drops plan.md
-> <workspace>/.orchestrator/plans/pending/
-> PlanWatcher._poll()
-> move pending -> processing
-> Planner calls submit_decomposition OR submit_task
-> StateManager.storeTasks() / submitWorkspaceTask()
-> task file written to exchange/inbox
-> TaskQueue emits task-available
```

### 5.3 Task dispatch -> Harness

```text
TaskDispatchLoop.dispatchAvailableTasks()
-> TaskQueue.getDispatchableTasks()
-> StateManager.moveToActive(task_id)
-> ModelSelector.selectProfile(task, queueStatus)
-> WorkerRegistry.register(workspaceId)
-> Runtime identity built
-> RuntimeManager.isBackendHealthy(runtimeBackend)
-> WorkerRegistry.assignTask(workerId, taskId)
-> RuntimeManager.spawn(...)
   -> RuntimeServiceManager.start(...)
   -> RuntimeRegistry.createLease(...)
   -> PointAllocator.reserve(...)
   -> HeartbeatStore.recordHeartbeat(...)
   -> WorkerProcessManager.spawn(payload)
-> Harness receives JSON payload over stdin
```

### 5.4 Harness -> callback -> task terminal

```text
Harness parse payload
-> WorkspaceLoader.load(task/context/skills)
-> CallbackClient.progress(phase events)
-> runReadyWorkflow()
-> CallbackClient.ready()
-> LLMHarness.run()
-> callback complete/failed/handover_required
-> Express /api/worker/complete
-> dispatchLoop.acknowledgeHarnessCompletion()
-> RuntimeRegistry.acceptTerminalCallback()
-> StateManager.moveToOutbox() OR requeueWithRetry() OR requeueWithHandover()
-> WorkerRegistry.clearAssignment()
-> StateManager.saveCheckpoint()
-> RuntimeManager.release()
```

## 6. Config va entrypoint

### `src/index.ts`

Entrypoint CLI.

Chinh:

```ts
const args = process.argv.slice(2);
const isServe = args.includes('serve') || args.length === 0;
```

Flow:

- Doc `--port`.
- Goi `promptConfig()`.
- Merge prompt overrides va CLI overrides.
- Goi `loadConfig(overrides)`.
- Goi `startServer(config)`.

Neu command khac `serve`, process exit voi `Unknown command`.

### `loadConfig(overrides: ConfigOverrides = {}): AppConfig`

File: `src/config.ts`

Input:

- `root?`: root cua orchestrator repo.
- `runtimeRoot?`: global runtime root.
- `workspaceRoot?`: bat buoc; khong co implicit workspace discovery.
- `profile?`: hien chi `hybrid`.
- `port?`, `host?`.
- `planWatcherIntervalMs?`.
- `pollTimeoutMs?`, `checkIntervalMs?`, `planPollTimeoutMs?`.
- `staleWorkerThresholdMs?`, `plannerAliveThresholdMs?`, `maxTaskRetries?`.

Tac dung:

- Normalize `workspaceRoot`.
- Sinh `workspaceId` bang SHA-256 path, lay 8 hex chars.
- Tao path config cho:
  - `<workspace>/.orchestrator/registry`
  - `<workspace>/.orchestrator/exchange`
  - `<workspace>/.orchestrator/plans`
  - `<workspace>/.orchestrator/context`
  - `<workspace>/.orchestrator/results`
- Tao global shared memory path `runtimeRoot/shared/case-bank`.
- Gan default server `127.0.0.1:3847`.

Throw:

- Neu `workspaceRoot` khong duoc cung cap.

### `promptConfig(): Promise<ConfigOverrides>`

File: `src/utils/startup-prompt.ts`

Tac dung:

- Hoi default/custom mode.
- Default mode lay `process.cwd()` lam workspace root sau khi user confirm.
- Custom mode bat buoc user nhap absolute workspace root.
- Tra ve `profile: 'hybrid'`, `workspaceRoot`, `host`, `port`, `planWatcherIntervalMs`.

## 7. MCP/HTTP server

### `startServer(config: AppConfig): Promise<void>`

File: `src/mcp-server/index.ts`

Trach nhiem:

- Bootstrap global dirs.
- Register primary workspace.
- Bootstrap workspace `.orchestrator`.
- Khoi tao `Logger`, `WorkerRegistry`, `StateManager`, `RecoveryManager`.
- Chay startup recovery.
- Start `PlanWatcher`.
- Ensure Ollama running.
- Khoi tao:
  - `OllamaAdapter`
  - `ModelSelector`
  - `VramManager`
  - `CapacityStore`
  - `InfraVerifier`
  - `TaskDispatchLoop`
  - `InfraResourceMonitor`
- Start dispatch loop, VRAM monitor, resource terminal table.
- Tao Express app.
- Dang ky:
  - `GET /health`
  - `POST /api/worker/ready`
  - `POST /api/worker/progress`
  - `POST /api/worker/complete`
  - MCP routes `/mcp`
- Xu ly shutdown `SIGINT`, `SIGTERM`.
- Optional one-shot mode qua `ORCHESTRATOR_ONESHOT=1`.

### `GET /health`

Output gom:

- `status`, `uptime`, `version`
- `last_start_clean`, `orphans_recovered`
- `connected_workers`
- `plan_watcher`
- `ollama_status`
- `vram`
- `infra_resources`
- `dispatch_loop`
- `active_workers`

### `POST /api/worker/ready`

Body yeu cau:

```json
{
  "worker_id": "w-...",
  "task_id": "task-id",
  "runtime_id": "w-...:task-id:1",
  "lease_generation": 1,
  "ready": true
}
```

Validation:

- `worker_id`, `task_id`, `runtime_id` la string.
- `lease_generation` la number.
- `ready` la boolean.
- Worker ton tai.
- Worker dang own dung `task_id`.
- Runtime identity match active harness.

Tac dung khi accept:

- `dispatchLoop.acknowledgeHarnessReady(...)`
- `RuntimeManager.markReady(identity)`
- `RuntimeManager.markRunning(identity)`
- Response `{ accepted: true }`.

Reject:

- `400`: payload sai.
- `404`: unknown worker.
- `409`: worker khong own task hoac lease mismatch.

### `POST /api/worker/progress`

Body yeu cau:

```json
{
  "worker_id": "w-...",
  "task_id": "task-id",
  "runtime_id": "w-...:task-id:1",
  "lease_generation": 1,
  "backend": "ollama",
  "phase": "model_loop",
  "message": "entering model loop"
}
```

Server hien validate 4 field identity bat buoc. `backend`, `phase`, `message` duoc Harness gui de visibility, nhung route hien chi dung identity de accept/reject.

Tac dung:

- `dispatchLoop.recordHarnessProgress(...)`
- Neu match active harness thi `{ accepted: true }`.
- Khong mutate task state.

### `POST /api/worker/complete`

Body chinh:

```json
{
  "worker_id": "w-...",
  "task_id": "task-id",
  "runtime_id": "w-...:task-id:1",
  "lease_generation": 1,
  "status": "complete|failed|handover_required",
  "summary": "short summary",
  "success": true,
  "error_context": {},
  "changelog": {}
}
```

Validation:

- Identity field dung type.
- `summary` string.
- `success` boolean.
- Worker ton tai.
- Worker dang own task.
- Runtime identity match active harness.
- Terminal callback chua duoc accept truoc do.

Terminal status resolve:

- Neu `status` la mot trong `complete`, `failed`, `handover_required`: dung truc tiep.
- Neu `success=false` va `error_context.error === 'context_exceeded'`: `handover_required`.
- Nguoc lai: `success ? complete : failed`.

Tac dung theo status:

- `handover_required`: goi `StateManager.requeueWithHandover(...)`, clear assignment, save checkpoint, response `{ accepted: true, action: 'requeued_with_handover', respawn_count }`.
- `success=true`: `StateManager.moveToOutbox(...)` voi status `done`, tang `worker.tasks_completed`.
- `summary === 'scope_violation'`: move outbox voi status `blocked`.
- Failure thuong:
  - Neu retry count >= max: move outbox status `failed`, `permanently_failed=true`.
  - Neu con retry: `StateManager.requeueWithRetry(...)`.

Quan trong:

- `dispatchLoop.setHarnessTerminalStatus(...)` dat status vao active harness.
- `dispatchLoop.acknowledgeHarnessCompletion(...)` goi `RuntimeManager.acceptTerminalCallback(...)`.
- Neu durable mutation bi error, route goi `dispatchLoop.rollbackHarnessCompletion(...)`.

## 8. MCP tools

### `setupMcpRoutes(app, context): McpTransports`

File: `src/mcp-server/transport.ts`

Routes:

- `GET /mcp`: reuse session by `mcp-session-id` header hoac `?sessionId=`.
- `POST /mcp`: initialize session khi body la MCP initialize request va chua co session id; neu co session id thi reuse.
- `DELETE /mcp`: close session transport.

Moi MCP session tao `McpServer` rieng qua `createServer(context)`, nhung cung share `ServerContext`.

### `createServer(context: ServerContext): McpServer`

File: `src/mcp-server/server.ts`

Tao MCP server:

```ts
new McpServer({ name: "orchestrator", version: VERSION })
```

Sau do goi `registerTools(server, context)`.

### `registerTools(server, context): void`

File: `src/mcp-server/tools.ts`

Dang ky MCP tools:

| Tool | Input chinh | Tac dung |
|---|---|---|
| `hello_world` | `name` | Health/greeting nho. |
| `register_workspace` | `workspace_path` | Connect/register workspace, bootstrap `.orchestrator`, verify match configured workspace. |
| `register_planner` | `workspace_path?` | Tao planner identity rieng, sync preflight/workflows tu `reference/planner-workflows/` sang workspace. Khong dung `workerRegistry`. |
| `create_plan` | `planner_id`, `title`, `conversation_summary`, `analysis`, `plan_markdown` | Tao plan markdown trong `plans/pending`, status `pending_user_approval`. |
| `create_tasks` | `planner_id`, `user_approved`, `tasks`, `graph`, `reasoning`, `source_plan` | Chi chay khi `user_approved=true`; tao queue task tu plan da approve, complete plan. |
| `planner_task_ready` | `planner_id`, `source_plan?`, `message?` | Planner bao server tasks da san sang dispatch. |
| `register_worker` | `workspace_path` | Tao worker id trong workspace registry, tra queue summary. |
| `get_status` | none | Tra server/version/uptime/connected_workers. |
| `submit_task` | `task_id`, `workspace_id`, `task_payload?`, `task_content_path?` | Materialize task markdown hoac doc legacy task file; register queue. |
| `complete_task` | `task_id`, `status`, `summary`, `worker_id` | Legacy worker completion qua MCP; mutate task state khong can runtime lease. |
| `report_progress` | `task_id`, `step`, `percentage`, `worker_id` | Legacy progress log + heartbeat. |
| `get_queue_status` | none | Queue counts + active workers. |
| `get_checkpoint` | none | Save queue checkpoint, tra path. |
| `submit_decomposition` | `tasks`, `graph`, `reasoning`, `source_plan`, `worker_id?` | Prefix task id theo plan, validate DAG, store tasks, complete plan. |
| `request_retry` | `task_id`, `reason`, `attempt` | Requeue failed/outbox task neu attempt <= max. |
| `force_release_task` | `task_id`, `reason` | Move stuck task tu active ve inbox, khong tang retry. |
| `get_template` | `template_name` | Doc template trong `templates/`, chong path traversal bang `basename`. |
| `ping` | `worker_id` | Update heartbeat. |
| `scan_workspace` | `force_update` | Tao/cache `.agent/workspace-memory.md`. |
| `session_checkpoint` | save/load/clear payload | Luu/doc/xoa `.agent/session.json`. |
| `close_workspace` | `workspace_id` | Mark workspace closed neu khong co active tasks. |
| `reopen_workspace` | `workspace_id` | Reopen workspace da closed, bootstrap lai dirs. |

`withHeartbeat(handler, context)`:

- Neu params co `worker_id`, goi `workerRegistry.updateHeartbeat(worker_id)`.
- Dung cho cac tool legacy worker/planner can keepalive.

### Planner workflow bootstrap

Planner khong con dung prompt template dan tay. Flow moi:

1. Planner goi `register_planner`.
2. Server copy source workflow:
   - `reference/planner-workflows/preflight.md`
   - `reference/planner-workflows/workflows/create-plan.md`
   - `reference/planner-workflows/workflows/create-tasks.md`
3. Server ghi sang workspace:
   - `.orchestrator/planner/preflight.md`
   - `.orchestrator/planner/workflows/create-plan.md`
   - `.orchestrator/planner/workflows/create-tasks.md`
4. Server tao record trong `registry/planners.json`.
5. Server tra `planner_id`, workspace identity, preflight content, workflow paths, required tools.

`PlannerRegistry`

File: `src/utils/planner-registry.ts`

- `register(workspaceId, workflowPaths)`: tao `p-xxxxxxxx`.
- `updateHeartbeat(plannerId)`: refresh heartbeat.
- `recordPlanCreated(plannerId, planFile)`: tang counter plan.
- `recordTasksCreated(plannerId, taskCount, planFile)`: tang counter task.
- `recordTaskReady(plannerId)`: mark planner da bao server ready.

Plan approval contract:

- `create_plan` chi tao file plan pending approval.
- `PlanWatcher` bo qua file co frontmatter `approval_status: pending_user_approval`.
- Planner phai bao user doc plan.
- Neu reject, user/planner sua plan file truc tiep; server khong mutate noi dung reject.
- Neu approve, planner moi duoc goi `create_tasks(user_approved=true)`.
- Sau khi `create_tasks` thanh cong, planner goi `planner_task_ready`.

Server van la owner cua dispatch. Planner khong goi worker execution tool.

### Task filename safety

Task id co the chua URL hoac ky tu Windows khong cho phep. Phase nay tach task id va filename:

- `src/utils/task-file-names.ts`
- `safeTaskFileStem(taskId)`: tao slug + hash deterministic.
- `taskFilePath(dir, taskId)`: filename an toan cho `task-*.json`.
- `resultFilePath(dir, taskId)`: filename an toan cho `result-*.json`.
- `findTaskFilePath(dir, taskId)`: doc ca filename moi va legacy filename cu.

JSON van giu `id/task_id` goc; chi filename duoc sanitize. Viec nay tranh bug queue co task nhung inbox file khong duoc tao khi task id chua `https://.../?...`.

Luu y compatibility:

- Phase 2 canonical path la Harness callback HTTP.
- `complete_task` MCP van ton tai cho legacy compatibility va co the mutate state khong can `runtime_id`.

## 9. StateManager va TaskQueue

### `StateManager`

File: `src/mcp-server/state-manager.ts`

Constructor:

```ts
new StateManager(logger: Logger | null, config: WorkspaceConfig)
```

Khoi tao:

- `queue = new TaskQueue()`
- `taskRegistry = new TaskIdentityRegistry(config.registry.tasks, config.workspaceId)`
- Ensure `exchange/inbox`, `exchange/active`, `exchange/outbox`.

#### Plan methods

`loadPlan(planMeta: PlanMeta): void`

- Set in-memory `this.plan`.
- Log `PLAN_LOADED`.

`getPlan(): PlanMeta | null`

- Tra plan metadata hien tai.

`checkPlansQuick(): PlansQuickStatus`

- Ensure `plans/pending`, `plans/processing`.
- Count `.md` files.
- Tra `{ hasPending, hasProcessing, pendingCount, processingCount }`.

`getProcessingPlan(): ProcessingPlanResult | null`

- Lay file `.md` dau tien trong `plans/processing`.
- Tra filename, relative plan path, content.

`checkPlans(): CheckPlansResult`

- Ensure `plans/pending`, `plans/processing`, `plans/done`.
- Neu co file processing: tra `busy`.
- Neu pending rong: tra `idle`.
- Neu co pending: sort ten file, move file cu nhat `pending -> processing`, tra `ready`.

`completePlan(filename: string): void`

- Move `plans/processing/<filename>` -> `plans/done/<filename>`.
- Log `PLAN_COMPLETED`.

#### Task methods

`storeTasks(tasks: TaskDef[], graph: TaskGraph): void`

- `queue.validateDAG(graph)`.
- `queue.loadFromGraph(tasks, graph)`.
- Register tung task vao `TaskIdentityRegistry`.
- Ghi `exchange/inbox/task-<id>.json`.
- Ghi `exchange/_queue.json`.

`moveToActive(taskId: string): void`

- Move `exchange/inbox/task-<id>.json` -> `exchange/active/task-<id>.json`.
- Update JSON status `active`.
- `queue.updateTaskStatus(taskId, active)`.
- `taskRegistry.setStatus(taskId, active)`.
- Throw neu file khong move duoc.

`moveToOutbox(taskId: string, result: TaskResult): void`

- Move `active/task-<id>.json` -> `outbox/task-<id>.json`.
- Update JSON status theo `result.status`.
- Ghi `outbox/result-<id>.json`.
- Update queue va task registry.
- `queue.pruneCompletedGroups()`, neu co prune thi update `_queue.json`.

`isTaskInActive(taskId: string): boolean`

- Check active file ton tai.
- Dung cho race guard recovery/callback.

`moveToInbox(taskId: string): void`

- Thu move tu `active` ve `inbox`; neu khong co thi thu tu `outbox`.
- Update JSON status `pending`.
- Clear task registry assignment qua status pending.
- `queue.requeueTask(taskId)`.
- Khong tang retry.

`getTaskRetryCount(taskId: string): number`

- Doc retry tu `active`, `outbox`, `inbox`.
- Fallback sang in-memory queue.

`requeueWithRetry(taskId: string, workspaceRoot?: string): number`

- Tim task file trong `active` hoac `outbox`.
- Tang `retry_count`.
- Neu co `workspaceRoot`, thu doc `.agent/session.json` de attach `error_context`.
- Ghi lai task file.
- Goi `moveToInbox`.
- Sync in-memory retry.
- Tra retry count moi.

`requeueWithHandover(taskId, handover, workspaceRoot?): number`

- Doc active task file.
- Tang `respawn_count`.
- Ghi `handover_context` vao task file.
- Move task ve inbox.
- Sync queue.
- Tra `respawn_count`.

`restoreFromFiles(): void`

- Rebuild queue tu `exchange/inbox`, `active`, `outbox`.
- Auto-recover failed task trong outbox neu `retry_count < MAX_TASK_RETRIES`.
- Doc `_queue.json`.
- Upsert task identity registry.
- Prune completed groups.

`getStatus(): TaskQueueStatus`

- Tra counts: `total`, `pending`, `active`, `done`, `failed`, `blocked`.

`getActiveTasksForWorkspace(workspaceId): TaskIdentityRecord[]`

- Lay active/assigned task trong registry.

`saveCheckpoint(): string`

- Ghi serialized queue vao `exchange/checkpoints/checkpoint-<timestamp>.json`.
- Rotate giu 10 file moi nhat.
- Tra relative path `checkpoints/<file>`.

`writeRecoverySignal(workerId, taskId, elapsedMs): void`

- Ghi `exchange/signals/recovery-needed.json`.
- Include `worker_id`, `last_task`, `stale_since`, `resume_hint`, `created_at`.

### `TaskQueue`

File: `src/mcp-server/task-queue.ts`

Fields:

- `tasks: Map<string, QueueTask>`
- `groups: TaskGroup[]`

Methods:

`validateDAG(graph): void`

- DFS detect circular dependency theo group.
- Throw `"Circular dependency detected in task graph"` neu co cycle.

`loadFromGraph(tasks, graph): void`

- Append groups.
- Set tasks status `pending`.
- Emit `task-available`.

`registerTaskMetadata(task: TaskMetadata): void`

- Check duplicate.
- Add task.
- Tao group moi voi `group_id = task.task_id`.
- Emit `task-available`.

`loadFromState(tasksMap, graph): void`

- Restore queue tu disk state.
- Sort group theo `group_id`.

`getUnlockedTasks(): QueueTask[]`

- Chon task pending trong group co dependencies da done.

`getActiveTasks(): QueueTask[]`

- Filter status `active`.

`canDispatch(task, activeTasks = getActiveTasks()): boolean`

- Check task dependencies done.
- Check target file lock: neu active task khac dang target cung file thi khong dispatch.

`getDispatchableTasks(): QueueTask[]`

- `getUnlockedTasks()`.
- Filter `canDispatch`.
- Sort:
  1. priority nho hon truoc.
  2. target file count it hon truoc.
  3. created_at cu hon truoc.

`getNextTask(): QueueTask | null`

- Tra dispatchable task dau tien.

`updateTaskStatus(taskId, status, extra?): boolean`

- Update in-memory task.
- Set `started_at` khi active neu field ton tai.
- Set `completed_at` khi done/failed/blocked neu field ton tai.
- Merge `extra`.

`requeueTask(taskId): void`

- Set status pending.
- Xoa `blocked_reason` neu co.
- Emit `task-available`.

`pruneCompletedGroups(): number`

- Xoa group ma tat ca task done/failed.
- Xoa task in-memory cua group do.

`getStatus(): TaskQueueStatus`

- Count theo status.

`serialize(): SerializedTaskQueue`

- Tra `{ graph: { groups }, tasks }`.

## 10. PlanWatcher va Recovery

### `PlanWatcher`

File: `src/mcp-server/plan-watcher.ts`

Constructor:

```ts
new PlanWatcher({
  stateManager,
  logger,
  config,
  workspaceRegistry?,
  intervalMs = 30000
})
```

Methods:

`start(): void`

- Set running true.
- Poll ngay lap tuc.
- Set interval.
- `unref()` timer.
- Log stats.

`stop(): void`

- Clear interval.
- Set running false.
- Log stopped.

`getStats(): PlanWatcherStatus`

- Tra `{ running, interval_ms, totalPolls, plansDetected, lastPollAt, lastPlanDetected, startedAt }`.

Private `_poll(): void`

- Neu co workspace registry:
  - Scan tat ca registered workspace.
  - Tim `.orchestrator/plans/pending/*.md`.
  - Bo qua plan co frontmatter `approval_status: pending_user_approval`.
  - Move file cu nhat sang `processing`.
  - Log `PLAN_DETECTED`.
- Neu khong co workspace:
  - Chi fallback `stateManager.checkPlans()` khi co pending plan khong phai pending approval.

### `RecoveryManager`

File: `src/mcp-server/recovery.ts`

Constructor:

```ts
new RecoveryManager({
  stateManager,
  workerRegistry,
  logger,
  config,
  recoveryConfig?
})
```

Config:

- `staleWorkerThresholdMs`: tu override hoac `config.global.recovery`.
- `monitorIntervalMs`: tinh bang `deriveHealthCheckIntervalMs(staleWorkerThresholdMs)`.
- `maxRetries`: default 3.
- `maxTaskRetries`: tu config hoac default 3.

Methods:

`setRuntimeLivenessProbe(probe): void`

- Nhan function `(workerId) => boolean`.
- Hien dung `dispatchLoop.isRuntimeAlive(workerId)`.

`markCleanShutdown(): void`

- Ghi marker `.shutdown_clean` trong `runtimeRoot`.

`wasCleanShutdown(): boolean`

- Check marker co ton tai.

`clearShutdownMarker(): void`

- Xoa marker sau startup recovery.

`detectOrphans(): string[]`

- Scan `exchange/active/task-*.json`.
- So voi worker registry current task.
- Task active khong co worker owner la orphan.

`requeueOrphans(): string[]`

- Goi `detectOrphans`.
- Move orphan task ve inbox bang `moveToInbox`.
- Khong tang retry vi orphan lifecycle khong phai proof task failed.

`checkStaleWorkers(): WorkerInfo[]`

- Duyet busy worker.
- Neu `last_heartbeat` qua threshold:
  - Neu runtime process van alive: update heartbeat, skip.
  - Neu khong alive: ghi recovery signal, `_handleStaleTask(worker)`.

Private `_handleStaleTask(worker): void`

- Neu task khong con trong active: mark disconnected, khong requeue.
- Neu task con active: `requeueWithRetry`, mark disconnected.

Private `_requeueFailedFromOutbox(): number`

- Safety net: failed task trong outbox va retry count < max thi move inbox.
- Khong tang retry vi retry da tinh luc fail.

`startMonitoring(): void`

- Set interval:
  - `checkStaleWorkers()`
  - `requeueOrphans()`
  - `_requeueFailedFromOutbox()`

`stopMonitoring(): void`

- Clear monitor timer.

`runStartupRecovery(): StartupRecoveryResult`

- Log recovery started.
- Check clean shutdown marker.
- `stateManager.restoreFromFiles()`.
- `requeueOrphans()`.
- `startMonitoring()`.
- Clear marker.
- Return `{ wasClean, orphanCount }`.

`runGracefulShutdown(): void`

- Stop monitoring.
- Save checkpoint.
- Mark clean shutdown.
- Log shutdown.

## 11. Dispatch loop va scheduler

### `TaskDispatchLoop`

File: `src/worker/dispatch-loop.ts`

Constructor:

```ts
new TaskDispatchLoop({
  queue,
  stateManager,
  workerRegistry,
  serverUrl,
  workspaceRoot,
  allowedTools,
  workspaceId,
  maxConcurrentWorkers?,
  maxTaskRetries?,
  staleWorkerThresholdMs?,
  capacityStore?
})
```

Fields chinh:

- `running`
- `queue`
- `stateManager`
- `workerRegistry`
- `modelSelector`
- `runtimeManager`
- `activeHarnesses: Map<runtime_id, ActiveHarness>`
- `maxConcurrentWorkers`
- `maxTaskRetries`
- `staleWorkerThresholdMs`

`resolveMaxConcurrentWorkers(configured?)`

- Lay configured hoac `ORCHESTRATOR_MAX_WORKERS` hoac profile default.
- Neu shared Ollama dev fallback thi cap max ve `OLLAMA_RUNTIME_DEFAULTS.SHARED_FALLBACK_MAX_WORKERS` = 1.

Methods public:

`start(): void`

- Set running true.
- Chay async loop.

`stop(): void`

- Set running false.

`getActiveWorkers()`

- Proxy `runtimeManager.getActiveWorkers()`.

`isRuntimeAlive(workerId): boolean`

- Proxy `runtimeManager.isAlive(workerId)`.

`killWorker(pid): void`

- Proxy runtime manager kill process.

`acknowledgeHarnessReady(workerId, taskId, runtimeIdentity, ready): boolean`

- Tim active harness by `runtime_id`.
- Check worker/task match.
- Check `LeaseValidator.identityMatches`.
- Require `ready === true`.
- Mark active harness `readyAccepted = true`.
- `runtimeManager.markReady`.
- `runtimeManager.markRunning`.

`recordHarnessProgress(workerId, taskId, runtimeIdentity): boolean`

- Chi validate active harness va runtime identity.
- Khong mutate state.

`setHarnessTerminalStatus(runtimeIdentity, status): void`

- Luu terminal status vao active harness truoc khi complete ack.

`acknowledgeHarnessCompletion(workerId, taskId, runtimeIdentity): boolean`

- Tim active harness.
- Reject neu worker/task mismatch, callback da accept, identity mismatch.
- Goi `runtimeManager.acceptTerminalCallback`.
- Set `completionAccepted = true`.

`rollbackHarnessCompletion(runtimeIdentity): void`

- Set `completionAccepted=false` neu durable mutation fail.

Private flow:

`loop(): Promise<void>`

- Lap khi running.
- Goi `dispatchAvailableTasks`.
- Neu khong dispatch thi sleep 2000ms.

`dispatchAvailableTasks(): Promise<number>`

- Trong khi active workers < max:
  - Lay first dispatchable task.
  - Goi `dispatchTask`.

`dispatchTask(task, queueStatus): Promise<void>`

- Move task inbox -> active.
- Validate active task path nam trong workspace root.
- Check `respawn_count >= MAX_RESPAWNS`, neu vuot thi block task.
- `modelSelector.selectProfile(task, queueStatus)`.
- Register worker.
- Build `RuntimeIdentity`.
- Build `RuntimeBackendProfile`.
- Check backend health.
- Build isolation:
  - Ollama: `shared-dev`.
  - CLI: `cli-session`.
- Build `AssignmentPayload` va `AssignmentEnvelope`.
- Assign task cho worker registry va task registry.
- Inject handover context neu co.
- Build Harness payload:
  - workspace/task/runtime identity.
  - backend.
  - assignment.
  - task file path.
  - callback URLs.
  - target files, skill paths, context paths.
  - model.
  - context threshold.
  - warm cache policy.
  - allowed tools.
  - handover context.
- Add active harness by runtime id.
- `runtimeManager.spawn(...)`.
- Monitor harness completion promise.

`monitorHarness(activeHarness, completion): Promise<void>`

- Wait child process completion.
- Neu terminal callback da accept:
  - exit code 0: success log.
  - exit khac/timeout: warn accepted-but-exited.
- Neu callback chua accept:
  - `handleMissingCompletionSignal`.
- Finally `releaseRuntimeLease`.

`handleMissingCompletionSignal(activeHarness, result): void`

- Warn timeout/exit/missing complete.
- Clear worker assignment.
- Neu task van active: `requeueOrFailActiveTask`.

`requeueOrFailActiveTask(taskId, workerId, reason): void`

- Neu retry >= max: move outbox failed, save checkpoint.
- Neu con retry: `requeueWithRetry`, save checkpoint.

### `ModelSelector`

File: `src/worker/model-selector.ts`

`evaluateDifficulty(signals: DifficultySignals): ModelProfile['mode']`

Input:

- `action`
- `targetFileCount`
- `doneCriteriaCount`
- `hasMultiModuleDeps`

Scoring:

- action `create|format|rename`: +1.
- `implement|refactor|fix`: +2.
- `debug|architect|migrate`: +3.
- target files > 5: +2, > 2: +1.
- done criteria > 6: +2, > 3: +1.
- multi-module deps: +2.

Output:

- score <= 3: `lite`.
- score <= 7: `standard`.
- otherwise `cloud`.

Profiles:

- `lite`: Ollama, env `ORCHESTRATOR_MODEL_LITE`, default `qwen3.5:4b-q4_k_m`, 16k ctx, 4GB, 1 point.
- `standard`: Ollama, env `ORCHESTRATOR_MODEL_STANDARD`, default `qwen3.5:9b-q4_k_m`, 32k ctx, 10GB, 2 points.
- `cloud`: env `ORCHESTRATOR_MODEL_CLOUD` default `gemini-2.5-flash`, backend `codex-cli` hoac `ag-cli`, 3 points.

`selectProfile(task, queueStatus): Promise<ModelProfile>`

- Build difficulty signals tu task.
- Neu difficulty cloud nhung `ORCHESTRATOR_MODEL_CLOUD` chua set, fallback `standard`.
- `resolveAvailableProfile`.
- `checkVRAM`.
- Tra profile.

`resolveAvailableProfile(profile)`

- Chi ap dung Ollama.
- Goi `ollamaAdapter.listModels()`.
- Neu model chua installed:
  - dung `ORCHESTRATOR_MODEL_FALLBACK` neu installed.
  - nguoc lai lay model installed dau tien.

`checkVRAM(profile)`

- Neu Ollama va capacity co `available_vram_mb`, warn neu free < estimated.

## 12. Runtime domain

### Runtime constants

File: `src/runtime/constants.ts`

Backends:

```ts
RUNTIME_BACKEND = {
  OLLAMA: 'ollama',
  CODEX_CLI: 'codex-cli',
  AG_CLI: 'ag-cli'
}
```

Isolation:

```ts
RUNTIME_ISOLATION = {
  SHARED_DEV: 'shared-dev',
  LEASE_LOCAL: 'lease-local',
  CLI_SESSION: 'cli-session'
}
```

Lease statuses:

```text
reserved
starting
ready
running
active
completing
handover_required
closed
stale
releasing
released
failed
```

Terminal callback statuses:

```text
complete
failed
handover_required
```

Ready workflow steps:

```text
process_spawned
payload_parsed
runtime_identity_verified
task_source_reachable
backend_adapter_initialized
model_session_reachable
heartbeat_registered
ready_callback_accepted
```

Warm cache defaults:

```text
TTL_MS = 10 minutes
RETAIN_ON_RELEASE = true
```

### Runtime models

File: `src/runtime/models.ts`

`RuntimeIdentity`

```ts
{
  runtime_id: string;
  worker_id: string;
  task_id: string;
  lease_generation: number;
}
```

Dung lam proof cho lease, heartbeat, backend session, callbacks.

`RuntimeBackendProfile`

```ts
{
  backend: RuntimeBackendKind;
  model?: string;
  endpoint_url?: string;
  command?: string;
  args?: string[];
  session_id?: string;
}
```

Dung de route backend Ollama/CLI.

`RuntimeIsolationProfile`

```ts
{
  mode: RuntimeIsolationKind;
  workspace_root: string;
  runtime_root?: string;
}
```

`RuntimeLease extends RuntimeIdentity`

Chua:

- `status`
- `backend`
- `isolation`
- `reserved_points`
- timestamps: `created_at`, `updated_at`, `expires_at`, `released_at`, `ready_at`, `running_at`
- terminal fields: `terminal_callback_status`, `terminal_callback_accepted_at`
- `service_handle_id?`

`RuntimeHeartbeat extends RuntimeIdentity`

Chua:

- `status`: healthy/stale/lost.
- `last_seen_at`
- `stale_at`
- `last_health_check_at`
- `next_health_check_at`
- `last_health_probe_status`
- `last_health_probe_at?`

`RuntimeServiceHandle`

Chua:

- identity.
- `backend`.
- `backend_session_id`.
- endpoint/pid/command/model optional.
- `status`.
- `started_at`, `updated_at`.
- `isolation`.
- `metadata?`.

`WarmModelCachePolicy`

```ts
{
  ttl_ms: number;
  retain_on_release: boolean;
  evict_on_pressure: boolean;
}
```

`WarmModelCacheEntry`

Key by backend/model/endpoint, co loaded/last_used/expires/retained.

### `RuntimeManager`

File: `src/runtime/runtime-manager.ts`

Constructor:

```ts
new RuntimeManager({
  staleWorkerThresholdMs,
  workspaceRoot,
  ollamaBaseUrl?,
  capacityStore?
})
```

Khoi tao:

- `RuntimeRegistry`
- `HeartbeatStore`
- `CapacityStore`
- `PointAllocator`
- `RuntimeServiceManager`
- `WorkerProcessManager`

Event:

- Listen `worker:heartbeat` tu `WorkerProcessManager`.
- Neu payload co runtime identity hop le:
  - `heartbeatStore.markHealthCheck(...)`
  - emit `runtime:heartbeat`.

Methods:

`isBackendHealthy(backend): Promise<boolean>`

- Proxy `RuntimeServiceManager.isBackendHealthy`.

`spawn(input: RuntimeSpawnInput): Promise<RuntimeSpawnResult>`

Input gom:

- `worker_id`
- `task_id`
- `lease_generation`
- `payload`
- `backend`
- `isolation?`
- `reserved_points`
- `capacity_request`
- `warm_cache_policy?`

Flow hien tai:

1. Tao `RuntimeIdentity`.
2. Default isolation la `shared-dev`.
3. `serviceManager.start(...)`.
4. `registry.createLease(...)`.
5. `pointAllocator.reserve(lease, capacity_request)`.
6. `heartbeatStore.recordHeartbeat(...)`.
7. `processManager.spawn(payload + service payload patch + backend + runtime_identity)`.
8. Tra `{ pid, worker_id, completion, runtimeIdentity }`.

`release(identity, status = released): Promise<void>`

- Lay lease.
- Release point reservation.
- Remove heartbeat.
- Mark lease released/failed/etc.
- `serviceManager.cleanup(...)`.
- Cleanup dung terminal status cua lease, fallback `complete`.
- Warm cache policy hien hardcoded default 10 minutes retain.

`markReady(identity): boolean`

- Mark lease `ready`.

`markRunning(identity): boolean`

- Mark lease `running`.

`acceptTerminalCallback(identity, status): boolean`

- Goi `RuntimeRegistry.acceptTerminalCallback`.
- Once-only terminal callback.

`probeRuntime(identity): Promise<boolean>`

- `serviceManager.probe(identity)`.
- `heartbeatStore.markProbe(identity, ok)`.

`getWarmModelCache()`

- Proxy service manager/capacity store.

`getHeartbeat(runtimeId)`, `isStale(runtimeId)`, `isAlive(workerId)`, `isRuntimeSessionAlive(identity)`, `kill(pid)`.

### `RuntimeRegistry`

File: `src/runtime/runtime-registry.ts`

`createLease(input): RuntimeLease`

- Reject neu da co active lease cho cung `task_id + lease_generation`.
- Tao lease status `starting`.
- Luu map by `runtime_id`.

`get(runtimeId): RuntimeLease | null`

- Lay lease.

`getActiveLeaseForTaskAttempt(taskId, leaseGeneration): RuntimeLease | null`

- Tim lease cung task/generation ma status open.

`getActiveLeases(): RuntimeLease[]`

- Filter open status.

`markStatus(runtimeId, status): RuntimeLease | null`

- Update status/timestamp.
- Set `ready_at` neu status ready.
- Set `running_at` neu status running.

`acceptTerminalCallback(runtimeId, status): RuntimeLease | null`

- Reject neu khong co lease hoac da co `terminal_callback_accepted_at`.
- Set lease status:
  - `handover_required` neu terminal status handover.
  - `completing` voi complete/failed.
- Set `terminal_callback_status`, `terminal_callback_accepted_at`.

`release(runtimeId, status = released): RuntimeLease | null`

- Set status, `updated_at`, `released_at`.

Open status la moi status khac `released`, `failed`, `closed`.

### `HeartbeatStore`

File: `src/runtime/heartbeat-store.ts`

`recordHeartbeat(identity, staleThresholdMs, nowMs = Date.now()): RuntimeHeartbeat`

- Set status healthy.
- `last_seen_at = now`.
- `stale_at = now + staleThresholdMs`.
- `last_health_check_at = now`.
- `next_health_check_at` tinh bang `deriveNextHealthCheckDelayMs`.
- probe status passed.

`markHealthCheck(identity, staleThresholdMs, nowMs?)`

- Alias recordHeartbeat.

`markProbe(identity, ok, nowMs?)`

- Update health probe passed/failed.
- Neu failed set heartbeat status stale.

`get(runtimeId)`, `isStale(runtimeId, nowMs?)`, `remove(runtimeId)`.

### `LeaseValidator`

File: `src/runtime/lease-validator.ts`

Static methods:

`identityMatches(expected, received): boolean`

- Match `runtime_id`, `worker_id`, `task_id`, `lease_generation`.

`ownsLease(lease, identity): boolean`

- Lease ton tai va identity match lease owner.

`canAcceptTerminalCallback(lease, identity): boolean`

- Own lease va chua co terminal callback accepted.

`canRecoverLease(input): boolean`

Input:

```ts
{
  lease,
  heartbeat,
  identity,
  serviceAlive,
  nowMs?
}
```

True khi:

- identity owns lease.
- co heartbeat.
- chua accepted terminal callback.
- service khong alive.
- heartbeat stale.
- last health probe failed.

Hien code chua wired day du vao `RecoveryManager`, nhung predicate da co.

### `PointAllocator`

File: `src/runtime/point-allocator.ts`

Constructor:

```ts
new PointAllocator(capacityStore)
```

`reserve(lease, request): PointReservation`

- Lay verified capacity.
- Neu co capacity:
  - Reject neu requested worker slots > max local runtimes.
  - Reject neu estimated VRAM > available VRAM.
- Luu reservation by `runtime_id`.

`release(identity): void`

- Xoa reservation.

`get(runtimeId)`, `getActiveReservations()`.

## 13. RuntimeServiceManager va backend adapters

### `RuntimeServiceManager`

File: `src/runtime/runtime-service-manager.ts`

Constructor:

```ts
new RuntimeServiceManager({
  workspaceRoot,
  ollamaBaseUrl?,
  capacityStore?
})
```

Khoi tao adapters:

- `ollama` -> `OllamaRuntimeServiceAdapter`
- `codex-cli` -> `CodexCliRuntimeServiceAdapter`
- `ag-cli` -> `AgCliRuntimeServiceAdapter`

Methods:

`start(input: RuntimeServiceStartInput): Promise<RuntimeServiceStartResult>`

- Chon adapter theo `input.backend.backend`.
- Goi adapter `start`.
- Luu `RuntimeServiceHandle` by `runtime_id`.
- Tra result.

`isBackendHealthy(backend): Promise<boolean>`

- Ollama: call `OllamaAdapter(endpoint_url).health()`.
- CLI: hien tra `true`.

`probe(identity): Promise<boolean>`

- Lay handle.
- Goi adapter probe.

`isAlive(identity): boolean`

- Ollama: true neu co handle.
- CLI: true neu handle co pid.

`getHandle(runtimeId): RuntimeServiceHandle | null`

- Lay service handle.

`cleanup(input): Promise<void>`

- Lay handle.
- Xoa handle.
- Goi adapter cleanup.

`getWarmModelCache()`

- Proxy `CapacityStore.getWarmModelCache()`.

### Ollama runtime service adapter

Class internal: `OllamaRuntimeServiceAdapter`.

`start(input)`

- Goi `OllamaRuntime.prepareLease(identity, backend, workspace_root)`.
- Tao handle:
  - backend `ollama`.
  - `backend_session_id = <runtime_id>:ollama`.
  - endpoint URL.
  - model.
  - status ready.
  - isolation.
  - metadata isolation mode.
- Tra `payload_patch`:
  - `ollama_base_url`.
  - `backend_session_id`.

`probe(handle)`

- Hien tra `true`.

`cleanup(input, handle)`

- `ollamaRuntime.releaseLease(identity)`.
- Neu co model, policy retain, va terminal status khong failed:
  - Set warm model cache entry trong CapacityStore.
  - Khong unload model.
- Neu failed hoac khong retain:
  - `OllamaAdapter(endpoint).unload(model)`.
  - Evict warm model cache.

### Codex CLI runtime service adapter

Class internal: `CodexCliRuntimeServiceAdapter`.

`start(input)`

- Goi `CodexCliRuntime.start({ identity, command, args })`.
- Tao handle:
  - backend `codex-cli`.
  - `backend_session_id = <runtime_id>:codex-cli`.
  - command, pid, model.
  - status ready.
  - isolation.
  - metadata args.
- Patch backend with `session_id`.
- Patch payload with `backend_session_id`.

`probe(handle)`

- `runtime.isAlive(handle.runtime_id)`.

`cleanup(input)`

- `runtime.kill(input.identity.runtime_id)`.

### AG CLI runtime service adapter

Giong Codex adapter, nhung backend `ag-cli`, default command `ag`.

### `OllamaRuntime`

File: `src/runtime-adapters/ollama/ollama-runtime.ts`

`isSharedOllamaDevFallback(): boolean`

- True neu `ORCHESTRATOR_OLLAMA_ISOLATION !== '1'`.
- Khi true, parallel local workers cap ve 1.

`prepareLease(identity, backend, workspaceRoot): OllamaRuntimeLease`

- Validate backend la `ollama`.
- Neu shared fallback:
  - endpoint = shared base URL.
  - isolation mode `shared-dev-fallback`.
  - runtime isolation `shared-dev`.
- Neu isolation enabled:
  - endpoint = `127.0.0.1:<basePort + hash(runtime_id)%1000>`.
  - runtime isolation `lease-local`.
- Tra backend patched endpoint va isolation.

`releaseLease(identity): void`

- Hien la stub; isolated Ollama process cleanup se nam o day khi private serve duoc bat.

### `CodexCliRuntime`

File: `src/runtime-adapters/codex-cli/codex-runtime.ts`

`start(input: CodexCliStartInput): CodexCliRuntimeSession`

- Spawn command default `codex`.
- Args tu input.
- Stream stdout/stderr voi prefix runtime id.
- Luu session map by runtime id.
- Xoa session khi child exit.

`kill(runtimeId): void`

- SIGTERM process va xoa session.

`isAlive(runtimeId): boolean`

- Check session map.

### `AgCliRuntime`

Giong Codex, default command `ag`.

## 14. WorkerProcessManager

File: `src/worker/process-manager.ts`

Constructor:

```ts
new WorkerProcessManager({ staleWorkerThresholdMs? })
```

`spawn(payload: WorkerPayload, options: SpawnOptions = {}): SpawnedWorker`

Input:

- `payload`: JSON gui vao harness stdin; can co `worker_id`, `task_id?`, `runtime_identity?`.
- `options.timeoutMs?`: default 5 phut.
- `options.scriptPath?`: default `dist/harness/index.js`.

Flow:

- Spawn `process.execPath [scriptPath]`.
- Attach stdout/stderr stream prefix by runtime identity neu co.
- Schedule health check truoc stale threshold.
- Moi health check emit `worker:heartbeat`.
- Timeout auto kill process.
- Child exit resolve completion promise `{ type: 'exit', code, signal }`.
- Timeout resolve `{ type: 'timeout' }`.
- Write payload JSON newline vao stdin.

`getActive()`

- Tra list active process, bo `process`, timers, completion promise.

`kill(pid): void`

- Clear timers.
- SIGTERM.
- Sau grace 3s, SIGKILL.
- Sau grace nua, platform fallback:
  - Windows: `taskkill /F /PID`.
  - Unix: `kill -9`.

## 15. Harness payload va runner

### `HarnessPayload`

File: `src/harness/payload.ts`

Fields:

- `workspace_id`
- `worker_id`
- `task_id`
- `runtime_id`
- `lease_generation`
- `workspace_root`
- `task_file_path?`
- `task_details?`
- `tool_bundle`
- `callback_url`
- `ready_url?`
- `progress_url?`
- `backend`
- `backend_session_id?`
- `ollama_base_url?`
- `model`
- `allowed_tools`
- `target_files`
- `skill_paths`
- `context_paths`
- `action`
- `module`
- `context_threshold?`
- `warm_cache_policy?`
- `handover_context?`
- `assignment?`

`parseHarnessPayload(rawInput: string): HarnessPayload`

- JSON.parse raw stdin.
- Goi `normalizeHarnessPayload`.

`normalizeHarnessPayload(input: unknown): HarnessPayload`

Validation va default:

- Payload phai la object.
- `callback_url` required, hoac build tu `server_url`.
- `ready_url` default replace `/complete` -> `/ready`.
- `progress_url` default replace `/complete` -> `/progress`.
- `workspace_id` lay tu raw hoac assignment.
- Runtime identity lay tu raw, `runtime_identity`, hoac assignment.
- Require `runtime_id`, `lease_generation`.
- Require `task_file_path` hoac legacy `task_details`.
- Require `model`.
- Backend default `ollama` neu backend invalid/missing.
- `tool_bundle` default `generic-file`.
- `target_files`, `skill_paths`, `context_paths` co fallback tu assignment metadata.
- Parse `warm_cache_policy` chi khi co du `ttl_ms`, `retain_on_release`, `evict_on_pressure`.

### `executeHarness(payload): Promise<number>`

File: `src/harness/runner.ts`

High-level:

1. Tao `CallbackClient`.
2. Dinh nghia lifecycle function gui progress callback best-effort.
3. Log start/model.
4. `WorkspaceLoader.load(payload)`.
5. Resolve tool names.
6. Tao `ToolExecutor`.
7. Tao `PromptBuilder`.
8. Build system/user messages.
9. Tao LLM adapter.
10. Run ready workflow.
11. Tao `LLMHarness`.
12. `harness.run(messages)`.
13. Gui terminal callback theo result.

Output process code:

- `0` khi complete success.
- `1` khi handover/failure/fatal.

Terminal mapping:

- `HarnessStatus.COMPLETE` -> callback status `complete`, `success: true`.
- `HarnessStatus.CONTEXT_EXCEEDED` -> callback status `handover_required`, `success: false`, `error_context.error = context_exceeded`, include handover record.
- Khac -> callback status `failed`, `success: false`.
- Fatal catch -> callback status `failed`, summary `Failed: <message>`.

`runReadyWorkflow(payload, adapter, callbackClient)`

Steps:

- `process_spawned`: true.
- `payload_parsed`: true.
- `runtime_identity_verified`: runtime/task/worker/lease present.
- `task_source_reachable`: task file or task details present.
- `backend_adapter_initialized`: true.
- `model_session_reachable`: `adapter.health()`.
- `heartbeat_registered`: true.
- Neu co failed step:
  - Gui ready callback `ready:false`.
  - Throw error.
- Neu ok:
  - Gui ready callback `ready:true`.
  - Add step `ready_callback_accepted`.

`buildSuccessionRecord(payload, handover, summary)`

- Tao handover object gom task/worker/runtime/lease, attempt/order, summary, progress, touched files, risks, checks, next action, content, created_at.

### Luu y backend adapter trong Harness

Hien code tao adapter:

```ts
createAdapter({
  adapter: payload.backend.backend === RUNTIME_BACKEND.OLLAMA ? 'ollama' : 'ollama',
  ...
})
```

Nghia la model loop hien van dung Ollama adapter ke ca khi runtime backend la CLI. Runtime service boundary cho `codex-cli`/`ag-cli` da co, nhung Harness LLM adapter cho CLI/cloud chua duoc wire that su. Xem phan limitations.

## 16. LLMHarness model loop

File: `src/harness/model-loop.ts`

Constructor:

```ts
new LLMHarness({
  adapter,
  model,
  contextLimit,
  contextThreshold,
  tools,
  toolExecutor,
  checkpoint?
})
```

`run(messages: ChatMessage[]): Promise<HarnessResult>`

Loop:

- Max tool calls: `HARNESS_LIMITS.MAX_TOOL_CALLS = 50`.
- Goi `adapter.chat({ model, messages, tools, timeoutMs })`.
- Add token usage.
- Push assistant message.
- Neu context percent >= threshold:
  - `generateHandover(messages)`.
  - Return `context_exceeded`.
- Neu khong co tool calls:
  - Tang `consecutiveNoTools`.
  - Sau 3 lan return error.
  - Truoc do push prompt yeu cau dung tool/complete_task.
- Neu tool call name `complete_task`:
  - Parse summary/changelog.
  - Return status `complete`.
- Neu JSON args malformed:
  - Tang malformed count.
  - Sau 3 lan return error.
  - Push tool error message de model sua.
- Execute tool qua `ToolExecutor`.
- Neu tool error `SCOPE_VIOLATION:`:
  - Return error summary `scope_violation`.
- Neu tool error khac:
  - Reflexion retry toi da 2 lan.
- Neu token usage >= 80%:
  - `writeCheckpoint(...)`.
- Neu het 50 tool calls:
  - Return `max_iterations`.

`getContextUsage()`

- Tra `{ used, limit, percent }`.

`generateHandover(messages)`

- Push `HANDOVER_PROMPT`.
- Goi model de viet handover.
- Return status `context_exceeded`.

`writeCheckpoint(hasError, toolErrorDiagnosis)`

- Ghi `<workspace>/.agent/session.json`.
- Format v3 unified checkpoint.
- Preserve old `created_at`, files_changed, completed_steps, remaining_steps neu co.

## 17. Harness tools va workspace loader

### `WorkspaceLoader`

File: `src/harness/workspace-loader.ts`

Constructor:

```ts
new WorkspaceLoader(workspaceRoot: string)
```

`load(payload): Promise<LoadedWorkspaceContext>`

- Neu `task_file_path`: doc task body.
- Nguoc lai dung `task_details`.
- Throw neu body rong.
- Load skill files va context files.

`loadTaskBody(taskFilePath)`

- Doc file task trong `.orchestrator`.
- Neu JSON co `task_content_path`, doc file content path do.
- Neu khong parse duoc JSON, coi active file la task body.

Security:

- Task/static path phai relative.
- Path phai nam trong workspace.
- Read orchestrator file phai nam duoi `.orchestrator`.

### `resolveToolNames(toolBundle, allowedTools): string[]`

File: `src/harness/tool-registry.ts`

- Bundle hien co: `generic-file`.
- Tools:
  - `view_file`
  - `list_dir`
  - `write_to_file`
  - `replace_file_content`
  - `run_command`
- Neu `allowedTools` rong hoac co `*`: tra full bundle.
- Nguoc lai filter theo allowed set.

### `buildToolDefinitions(toolNames): ToolDefinition[]`

- Tao OpenAI-style function tool definitions cho tung tool.
- Luon push them `complete_task`.
- `complete_task` required:
  - `summary`
  - `changelog` gom `files_touched`, `lines_added`, `lines_removed`, `logic_description`.

### `ToolExecutor`

File: `src/worker/tool-executor.ts`

Constructor:

```ts
new ToolExecutor(workspaceRoot, allowedTools, declaredTargetFiles = [])
```

Security:

- Absolute input path bi sanitize de treat nhu relative.
- Resolved path phai nam trong workspace root.
- Symlink existing file phai realpath nam trong workspace root.
- Neu `declaredTargetFiles` khong rong, write chi duoc vao dung target file.

Methods:

`execute(toolName, args): Promise<ToolResult>`

- Enforce max 50 calls.
- Check tool allowed.
- Dispatch:
  - `view_file`
  - `list_dir`
  - `write_to_file`
  - `replace_file_content`
  - `run_command`

`view_file(args)`

- Require `path`.
- Optional `start_line`, `end_line`.
- Tra content.

`list_dir(args)`

- Require `path`.
- Tra entries dang `DIR name` / `FILE name`.

`write_to_file(args)`

- Require `path`, `content`.
- Enforce target scope.
- mkdir parent.
- Write file.

`replace_file_content(args)`

- Require `path`, `target`, `replacement`.
- Enforce target scope.
- File phai ton tai.
- Target string phai co trong file.
- Replace lan dau theo JS `String.replace`.

`run_command(args)`

- Require `command`.
- Optional `cwd`.
- Cwd sandboxed.
- Timeout 60s.
- Tra stdout + stderr, hoac error string.

## 18. CallbackClient

File: `src/harness/callback-client.ts`

Constructor:

```ts
new CallbackClient(callbackUrl, readyUrl?, progressUrl?)
```

- `readyUrl` default `callbackUrl.replace(/\/complete$/, '/ready')`.
- `progressUrl` default `callbackUrl.replace(/\/complete$/, '/progress')`.

`complete(input: CompletionCallbackInput): Promise<void>`

Posts:

- `worker_id`
- `task_id`
- `runtime_id`
- `lease_generation`
- `status`
- `backend`
- `backend_session_id`
- `summary`
- `success`
- `error_context`
- `changelog`

`ready(input: ReadyCallbackInput): Promise<void>`

Posts ready status va ready steps.

`progress(input: ProgressCallbackInput): Promise<void>`

Posts phase/message.

Private `postAndRequireAccepted(url, body, rejectedText)`

- Timeout 30s.
- Require HTTP ok.
- Require response JSON co `accepted === true`.
- Neu `accepted === false` hoac missing accepted thi throw.

## 19. Infra va visibility

### `CapacityStore`

File: `src/infra/capacity-store.ts`

Fields:

- `verifiedCapacity`
- `warmModelCache: Map<backend:model:endpoint, entry>`

Methods:

- `setVerifiedCapacity(capacity)`.
- `getVerifiedCapacity()`.
- `clear()`.
- `setWarmModelCacheEntry(entry)`.
- `getWarmModelCache()`: prune expired entries truoc khi return.
- `evictWarmModelCache(key)`.

### `InfraVerifier`

File: `src/infra/infra-verifier.ts`

Constructor:

```ts
new InfraVerifier({ getVramStatus })
```

`verify(): VerifiedInfraCapacity`

- Lay VRAM status.
- Lay total/free RAM tu `os`.
- Lay CPU cores.
- Provider:
  - `local-gpu` neu VRAM available.
  - `local-cpu` neu khong.
- `max_local_runtimes = max(1, cpuCores)`.
- Supported backends: `ollama`, `codex-cli`, `ag-cli`.

### `InfraResourceMonitor`

File: `src/infra/resource-monitor.ts`

Constructor deps:

- `getUptimeSeconds`
- `getDispatchLoopStatus`
- `getQueueStatus`
- `getActiveWorkers`
- `getVramStatus`
- `checkOllamaHealth`
- `listOllamaModels`
- `verifyCapacity?`
- `getWarmModelCache?`

`collect(): Promise<InfraResourceSnapshot>`

- Collect Ollama health/models, VRAM, queue, active workers, capacity, warm cache, RAM, CPU.
- Cache latest.

`start(intervalMs, onSnapshot?)`

- Stop old timer.
- Collect immediate.
- Set interval, `unref`.

`stop()`

- Clear timer.

`resolveInfraResourceMonitorIntervalMs(raw)`

- Parse env interval, fallback default 10s.

### `renderInfraResourceTable(snapshot): string`

File: `src/visibility/resource-terminal-table.ts`

Render terminal table gom:

- snapshot uptime.
- dispatch loop status.
- queue pending/active/done/failed/blocked/total.
- active workers.
- capacity provider/backends/runtimes.
- Ollama health/models.
- warm model cache.
- VRAM.
- RAM.
- CPU load.

Visibility chi doc snapshot, khong mutate state.

## 20. Workspace, task, worker registry

### `WorkspaceRegistry`

File: `src/utils/workspace-registry.ts`

`normalizeWorkspacePath(workspacePath): string`

- Trim va `resolve`.
- Throw neu rong.

`generateWorkspaceId(workspacePath): string`

- SHA-256 normalized absolute path.
- Lay 8 hex chars dau.

Constructor:

```ts
new WorkspaceRegistry(runtimeRoot)
```

Registry file:

```text
<runtimeRoot>/workspaces.json
```

Methods:

`register(workspacePath): WorkspaceMetadata`

- Path phai ton tai.
- Neu fresh: tao metadata active, bootstrap workspace.
- Neu existed closed: throw, yeu cau `reopen`.
- Neu existed active: update path/name, bootstrap.

`reopen(workspaceId): WorkspaceMetadata`

- Workspace phai ton tai trong registry.
- Neu active: no-op.
- Path phai con ton tai.
- Set active, remove `closed_at`.

`close(workspaceId): WorkspaceMetadata | null`

- Set status closed, set `closed_at`.
- Khong xoa runtime state.

`isActive(workspaceId)`, `getAll()`, `getById(id)`.

### `TaskIdentityRegistry`

File: `src/utils/task-identity-registry.ts`

Purpose:

- Luu identity va status task trong `registry/tasks.json`.
- Khong duoc luu body/content/description.

Constructor:

```ts
new TaskIdentityRegistry(registryPath, workspaceId)
```

Methods:

`registerTask(input): TaskIdentityRecord`

- Check workspace match.
- Reject duplicate.
- Tao record voi assigned_worker_id null.

`upsertTask(input): TaskIdentityRecord`

- Register neu chua co.
- Update neu co.

`getById(taskId)`, `getAll()`.

`setStatus(taskId, status, extra?)`

- Update status.
- Pending: clear assignment, delete `started_at`.
- Active: set `started_at`.
- Done/failed/blocked: clear assignment, set `completed_at`.

`assignTask(taskId, workerId, workspaceId)`

- Task phai active.
- Khong duoc da assigned cho worker khac.
- Set assigned_worker_id.

`clearAssignment(taskId)`

- Clear assigned worker.

`getActiveTasksForWorkspace(workspaceId)`

- Active hoac co assigned_worker_id.

`upsertFromQueueTask(task, workspaceId, status)`

- Sync queue task vao registry.

### `WorkerRegistry`

File: `src/utils/worker-registry.ts`

Singleton:

```ts
export const workerRegistry = new WorkerRegistry();
```

Methods:

`setRegistryPath(filePath): void`

- Set path `registry/workers.json`, reload.

`register(workspaceId): WorkerInfo`

- Sinh id `w-<8 hex>`.
- Status idle.
- Persist.

`getWorker(id)`, `getAllWorkers()`.

`getActiveWorkerCount()`

- Count worker khac disconnected.

`markDisconnected(id): boolean`

- Set status disconnected.
- Clear current task.
- Set `disconnected_at`.
- Giu entry de late result co context.

`cleanupDisconnected(): number`

- Xoa disconnected worker o startup.

`clearAll(): void`

- Clear registry khi server shutdown.

`updateHeartbeat(id): boolean`

- Update `last_heartbeat`.
- Neu disconnected thi reactivate idle.

`setRole(workerId, role): boolean`

- Set legacy role.

`assignTask(workerId, taskId, taskRegistry?)`

- Worker khong duoc own task khac.
- Neu co taskRegistry:
  - Check task exists.
  - `assertCanAssignTask`.
  - `taskRegistry.assignTask(...)`.
- Set worker busy, current task, heartbeat.

`clearAssignment(workerId, taskRegistry?)`

- Clear task registry assignment neu co.
- Set worker idle.

`getActivePlanner(plannerAliveThresholdMs)`

- Legacy planner role lookup.

## 21. Task submission va metadata

### `submitWorkspaceTask(context, input): SubmitWorkspaceTaskResult`

File: `src/server-tools/task-submitter.ts`

Input:

```ts
{
  task_id: string;
  workspace_id: string;
  task_payload?: {
    action: string;
    body: string;
    priority?: number;
    tool_bundle?: string;
    depends_on?: string[];
    target_files?: string[];
    read_files?: string[];
    skill_paths?: string[];
    context_paths?: string[];
  };
  task_content_path?: string;
}
```

Validation:

- `workspace_id` phai match configured workspace.
- Task id chua co trong queue.
- Workspace ton tai va active.
- Chi duoc dung mot trong `task_payload` hoac `task_content_path`.

Flow voi `task_payload`:

- Render markdown vao `.orchestrator/tasks/<safe-task-id>.md`.
- Frontmatter gom `task_id`, `action`, `priority`, `tool_bundle`, arrays.
- Parse metadata.
- Atomic write content file.
- Register task identity.
- Register queue metadata.
- Ghi `exchange/inbox/task-<id>.json`.
- Update `_queue.json`.

Flow voi legacy `task_content_path`:

- Path relative workspace root.
- Phai nam trong `.orchestrator`.
- File phai ton tai.
- Parse metadata tu file.

Output:

- `status: 'registered'`
- `task_id`
- `task_content_path`
- `materialized_by: 'server' | 'planner-file'`
- target/dependency counts.

### `parseTaskMetadata(input): TaskMetadata`

File: `src/models/task-metadata.ts`

Input:

- `content`
- `workspace_id`
- `task_content_path`
- `submitted_task_id`
- `created_at?`

Format yeu cau:

```markdown
---
task_id: my-task
action: implement
priority: 0
depends_on:
  - other-task
target_files:
  - src/file.ts
---

Task body...
```

Validation:

- File phai bat dau bang YAML-ish frontmatter wrapped `---`.
- `task_id` required va phai match submitted task id.
- `action` required.

Output:

- `TaskMetadata extends TaskDef`.
- Normalize arrays:
  - `depends_on`
  - `dependencies`
  - `target_files`
  - `read_files`
  - `skill_paths`
  - `context_paths`
- Default `tool_bundle = generic-file`.
- `description = body.trim()`.
- `status = pending`.

## 22. Session checkpoint va workspace scan

### `executeSessionCheckpoint(workspaceRoot, input)`

File: `src/mcp-server/tools/session-checkpoint.ts`

File:

```text
<workspace>/.agent/session.json
```

Actions:

`save`

- Tao `.agent` neu can.
- Build v3 checkpoint:
  - `version: 3`
  - `task_id`
  - `phase`
  - `files_changed`
  - `completed_steps`
  - `remaining_steps`
  - `error_context`
  - `token_usage`
  - `created_at`, `updated_at`
- Validate Zod.
- Write JSON.

`load`

- Neu file khong co: `{ status: 'no_session' }`.
- Neu version 3: validate va return.
- Neu v1/v2: migrate sang unified v3 shape.

`clear`

- Xoa session file neu co.

### `executeScanWorkspace(rootDir, forceUpdate)`

File: `src/mcp-server/tools/scan-workspace.ts`

Output file:

```text
<rootDir>/.agent/workspace-memory.md
```

Neu output da co va `forceUpdate=false`: return cached.

Generate:

- Scan file tree toi da 500 files.
- Ignore `node_modules`, `.git`, `dist`, `.next`, coverage, cache dirs.
- Infer file type/purpose.
- Parse local TS/JS imports.
- Analyze last 100 git commits de tim co-change pairs.
- Write markdown memory.

Luu y:

- Tool nay doc workspace de tao memory file. Theo doctrine, day la explicit MCP/admin tool, khong phai server tu suy luan strategy trong normal dispatch.

## 23. Warm model cache

Warm model cache la optimization cho local model, khong phai ownership source.

Ownership van la:

```text
RuntimeLease owns execution right.
WarmModelCache owns reusable loaded model capacity only.
```

Implementation hien tai:

- `WarmModelCachePolicy` co:
  - `ttl_ms`
  - `retain_on_release`
  - `evict_on_pressure`
- `CapacityStore` luu warm cache entries by:

```text
backend:model:endpoint_url
```

- Khi `RuntimeServiceManager.cleanup()` voi Ollama:
  - Neu terminal status khong `failed`, model co ten, va `retain_on_release=true`:
    - Tao cache entry.
    - Set `expires_at = now + ttl_ms`.
    - Khong unload model.
  - Neu failed hoac khong retain:
    - Goi Ollama unload.
    - Evict cache.
- `getWarmModelCache()` prune expired entries khi doc.
- Infra resource monitor expose `warm_model_cache`.
- Terminal table hien `backend:model`.

Current defaults:

```text
ttl_ms = 10 minutes
retain_on_release = true
evict_on_pressure = true
```

Current limitation:

- Dispatch payload co `warm_cache_policy`, runtime service start input cung support policy, nhung dispatch hien chua pass `warm_cache_policy` vao `runtimeManager.spawn(...)`.
- Release path hien dung default policy trong `RuntimeManager.release(...)`.

## 24. Callback semantics chi tiet

### Ready

Ready la mini workflow, khong chi la process spawned.

Harness gui ready sau khi:

1. process spawned.
2. payload parsed.
3. runtime identity present.
4. task source reachable.
5. backend adapter initialized.
6. model/session health ok.
7. heartbeat registered.

Server accept ready khi:

- Worker ton tai.
- Worker own dung task.
- Runtime identity match active harness.
- `ready === true`.

Server effect:

- Lease `ready`.
- Lease `running`.

Ready failed:

- Harness gui `ready:false`.
- Server route hien reject qua `acknowledgeHarnessReady(... ready=false)`.
- Harness throw, fatal callback failed neu co the.
- Dispatch monitor neu khong accepted completion thi requeue/fail active task.

### Progress

Progress la visibility/heartbeat-like event.

Server accept progress khi:

- Active harness exists by `runtime_id`.
- Worker/task match.
- Runtime identity match.

Server effect:

- Khong mutate task state.
- Khong mark lease status.
- Response chi `{ accepted: true }`.

Harness progress la best-effort:

- `executeHarness` swallow progress callback errors.
- Terminal callback van authoritative.

### Complete

Complete la terminal callback.

Accepted terminal callback la once-only:

- `RuntimeRegistry.acceptTerminalCallback` reject neu `terminal_callback_accepted_at` da co.
- Dispatch loop reject neu `completionAccepted` da true.

Terminal statuses:

- `complete`: task done.
- `failed`: retry hoac permanent failure.
- `handover_required`: context succession, khong xem la normal failure.

Task mutation sau accepted:

- `complete + success=true` -> move outbox `done`.
- `failed` -> retry hoac outbox `failed`.
- `scope_violation` -> outbox `blocked`.
- `handover_required` -> requeue with `handover_context` va `respawn_count`.

Late/duplicate callbacks:

- Wrong worker/task/runtime/lease -> `409`.
- Duplicate terminal callback -> `409` qua `acceptTerminalCallback` false.
- Worker da clear assignment -> `409 not assigned`.

### Handover/context succession

Trigger:

- `LLMHarness` context usage vuot threshold.
- `generateHandover` goi model de viet handover.
- Harness callback status `handover_required`, success false.

Server effect:

- Validate lease.
- `StateManager.requeueWithHandover`.
- Active task file duoc gan:
  - `handover_context`
  - `respawn_count`
- Task move ve inbox.
- Lan dispatch tiep theo payload co `handover_context`.
- Neu `respawn_count >= MAX_RESPAWNS` (3), dispatch block task.

Y nghia:

- `handover_required` khong phai crash.
- Day la planned succession de task tiep tuc trong harness moi.

## 25. Failure va recovery semantics

### Missing completion

Neu Harness process exit/timeout ma terminal callback chua accepted:

- Dispatch loop clear assignment.
- Neu task van active:
  - `requeueOrFailActiveTask`.
- Retry count tang qua `requeueWithRetry`.
- Neu retry >= max: outbox failed permanent.

### Backend unavailable

Trong dispatch:

- `runtimeManager.isBackendHealthy(runtimeBackend)`.
- Ollama health false -> log throttled, requeue/fail active task.
- CLI backends hien `isBackendHealthy` return true.

### Scope violation

Trong `ToolExecutor.ensureWriteAllowed`:

- Neu task khai bao `target_files` va tool write path khong nam trong set:
  - Throw `SCOPE_VIOLATION: ...`.
- `LLMHarness` return summary `scope_violation`.
- Server complete route mark task `blocked`.

### Stale worker

Recovery stale worker theo worker registry heartbeat:

- Neu process alive: refresh heartbeat va skip.
- Neu process dead/stale va task con active: requeue with retry.
- Neu task da khong con active: mark worker disconnected, khong requeue.

Runtime-level `LeaseValidator.canRecoverLease` da co predicate tot hon, nhung RecoveryManager hien van worker-centric. Xem limitations.

## 26. Extension points

### Them backend runtime moi

Can lam:

1. Them constant vao `RUNTIME_BACKEND`.
2. Them type/model neu can trong `src/runtime/models.ts`.
3. Viet runtime adapter class implement `RuntimeServiceAdapter`:
   - `backend`
   - `start(input)`
   - `probe(handle)`
   - `cleanup(input, handle)`
4. Dang ky adapter trong `RuntimeServiceManager.constructor`.
5. Update `ModelSelector` profile backend/model/command/args.
6. Update Harness `createAdapter` mapping neu backend can model-loop adapter moi.
7. Update infra supported backends.
8. Update visibility text neu can.

Rule:

- Backend adapter khong mutate task state.
- Terminal callback van qua Harness.

### Them tool bundle moi

File: `src/harness/tool-registry.ts`.

Can:

- Add bundle name vao `TOOL_BUNDLES`.
- Add schema trong `schemaForTool`.
- Implement tool behavior trong `ToolExecutor.execute`.
- Neu write tool moi, enforce workspace sandbox va target scope.

### Them task metadata field moi

Can update:

- `TaskPayloadSchema` trong `tools.ts` neu tool submit_task nhan field.
- `TaskPayload` va `renderTaskMarkdown` trong `task-submitter.ts`.
- `ParsedFrontmatter` va `parseTaskMetadata`.
- Assignment metadata trong `TaskDispatchLoop.buildAssignmentPayload`.
- Harness payload normalize neu field can den runner.

### Them callback event moi

Can update:

- Harness constants/status.
- `CallbackClient`.
- Express route trong `mcp-server/index.ts`.
- `TaskDispatchLoop` active harness state neu event co ownership/timing effect.
- RuntimeRegistry neu event doi lease status.

### Thay doi recovery predicate

Huong dung Phase 2:

- Dung `RuntimeRegistry` + `HeartbeatStore` + `RuntimeServiceManager.probe`.
- Chi reclaim khi:
  - heartbeat expired.
  - health probe failed.
  - service dead.
  - active task van own same runtime_id + lease_generation.
  - no terminal callback accepted.

## 27. Safety rules dang enforce

Workspace:

- `workspaceRoot` bat buoc.
- Workspace ID deterministic tu absolute path.
- Register workspace missing path bi reject.
- Closed workspace khong auto reopen.

Task:

- Task registry khong duoc luu body/content/description.
- Task content path phai relative workspace va nam trong `.orchestrator`.
- Target file lock trong `TaskQueue.canDispatch`.
- Scope write lock trong `ToolExecutor`.

Runtime:

- Callback phai match `runtime_id`, `worker_id`, `task_id`, `lease_generation`.
- Terminal callback once-only.
- Point reservation validate verified capacity neu co.

Filesystem:

- JSON write qua `atomicWrite`.
- Path sandbox trong Harness loader va ToolExecutor.

## 28. Current limitations / can chu y

1. **Legacy MCP `complete_task` con mutate state khong can runtime lease.**
   Duong canonical Phase 2 la Harness callback HTTP. Legacy tool nen duoc coi la compatibility path.

2. **RecoveryManager van worker-centric.**
   `LeaseValidator.canRecoverLease` da co predicate runtime-level, nhung recovery loop hien chua fully wire active lease + heartbeat probe + service liveness.

3. **CLI backend service da co boundary nhung Harness model loop chua dung CLI adapter.**
   `RuntimeServiceManager` co `codex-cli` va `ag-cli`, nhung `executeHarness` hien map non-Ollama backend ve Ollama adapter. Can task tiep theo neu muon CLI model loop that.

4. **Ollama isolated runtime cleanup chua implement.**
   `OllamaRuntime.releaseLease` la stub. Shared-dev fallback la mode mac dinh, parallel local worker cap ve 1.

5. **Warm cache policy chua duoc pass day du tu dispatch sang spawn/release.**
   Payload co policy, models co policy, service manager support, nhung release hien dung default policy.

6. **`ready:false` path chua co route recovery rieng.**
   Ready failed se dan toi harness throw/failure callback hoac missing completion; chua co dedicated ready-failed state machine.

7. **Version constant van `0.2.0`.**
   Doc nay la Phase 2 v0.3.0 reference, khong dong nghia package/runtime version da bump.

8. **Health check CLI backend hien optimistic.**
   `isBackendHealthy` tra true voi CLI backends; actual spawn/probe xu ly sau.

9. **No test/build run cho doc nay.**
   Theo yeu cau user, tai lieu duoc viet tu code read-only, khong verify bang test/build trong turn nay.

## 29. Mental model nhanh cho nguoi doc code

Neu muon hieu "task dang di dau", doc theo thu tu:

1. `src/index.ts`: entrypoint.
2. `src/config.ts`: path config.
3. `src/mcp-server/index.ts`: server bootstrap + callback routes.
4. `src/mcp-server/state-manager.ts`: file state transitions.
5. `src/mcp-server/task-queue.ts`: DAG + dispatchable tasks.
6. `src/worker/dispatch-loop.ts`: dispatch task -> runtime lease -> harness payload.
7. `src/runtime/runtime-manager.ts`: lease/heartbeat/point/service orchestration.
8. `src/runtime/runtime-service-manager.ts`: backend service handles.
9. `src/worker/process-manager.ts`: spawn harness process.
10. `src/harness/payload.ts`: parse stdin payload.
11. `src/harness/runner.ts`: ready/progress/complete lifecycle.
12. `src/harness/model-loop.ts`: model/tool loop.
13. `src/harness/callback-client.ts`: server callback contract.

## 30. Checklist dung huong Phase 2

Khi sua code, check cac cau hoi nay:

- Task state co chi duoc server mutate khong?
- Signal terminal co du `runtime_id + lease_generation` khong?
- Worker co dang la Harness instance cho mot task attempt khong?
- Backend adapter co dang chi quan ly model/CLI mechanics, khong mutate task state khong?
- Callback duplicate/late co bi reject truoc khi move file khong?
- Handover co requeue task voi `respawn_count`, khong tinh la failed khong?
- Warm cache co bi dung lam ownership state khong? Neu co la sai.
- Recovery co dang reclaim dua tren proof, khong dua tren stale time thuan tuy khong?
- Tool write co nam trong workspace va declared target files khong?
- Server co doc private workspace content de suy luan strategy khong? Neu co la sai.
