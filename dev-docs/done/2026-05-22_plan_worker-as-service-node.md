# Plan: Worker = 1 Service Node

> **Date**: 2026-05-22
> **Type**: Architecture Correction Plan
> **Status**: Draft — cần owner review trước khi thực thi
> **Prerequisite**: Đọc `dev-docs/2026-05-22_analysis_harness-centric-architecture-gap.md`

---

## 1. Định nghĩa đúng: Worker là gì

**1 Worker = 1 service node hoàn chỉnh**, tương đương 1 Docker container/backend instance.

Khi server spawn 1 Worker, nó phải là **1 đơn vị tự trị** với:

| Thuộc tính | Mô tả |
|------------|-------|
| **Identity** | `worker_id` + `runtime_id` + `lease_generation` — định danh duy nhất, dùng để reject stale signals |
| **Backend** | Biết mình chạy bằng gì: Ollama (model nào, endpoint nào), Codex CLI, AG CLI, Gemini API |
| **Lifecycle** | `spawning → ready → running → completing → done/failed → cleanup` |
| **Processors** | LLM adapter, tool executor, prompt builder — tự chứa, không phụ thuộc server |
| **Heartbeat** | Tự report liveness — server detect stale/dead |
| **Task binding** | Gắn chặt 1 task — 1 worker = 1 task tại 1 thời điểm |
| **Completion** | Tự report kết quả về server qua callback |
| **Isolation** | Process/container/session riêng — crash 1 worker không ảnh hưởng worker khác |

### So sánh với hiện tại

| Aspect | Hiện tại | Đúng ra |
|--------|----------|---------|
| **WorkerInfo** | 13-line record: id + heartbeat + status | Full Worker entity với lifecycle state machine |
| **Worker creation** | `workerRegistry.register()` → tạo record → `processManager.spawn()` → tạo process | `WorkerNode.spawn(config)` → tạo service node hoàn chỉnh |
| **Backend binding** | Server quyết rồi hardcode Ollama vào payload | Worker nhận backend config, tự khởi tạo adapter |
| **Lifecycle** | Rải rác: dispatch-loop track `ActiveHarness`, processManager track PID, workerRegistry track heartbeat | Worker node sở hữu lifecycle riêng |
| **Heartbeat** | processManager emit timer event → runtimeManager relay → workerRegistry update | Worker node tự report, server chỉ lắng nghe |
| **Completion** | 2 paths: callback URL + MCP tool — duplicated logic | 1 path: Worker callback → server completion handler |

---

## 2. Hiện trạng: Worker bị xé ra 5 chỗ

Hiện tại khái niệm "Worker" bị phân tán:

```
"Worker" hiện tại = tổng hợp 5 thứ rời rạc:

1. WorkerInfo (models/worker.ts)           → chỉ là record 13 dòng
2. WorkerRegistry (utils/worker-registry.ts) → track records
3. WorkerProcessManager (worker/process-manager.ts) → spawn + kill child process
4. ActiveHarness (worker/dispatch-loop.ts)  → track task binding + completion
5. RuntimeManager (runtime/runtime-manager.ts) → heartbeat + lease + backend

Không có nơi nào gom thành 1 entity hoàn chỉnh.
```

### Vấn đề khi xé ra:

1. **Spawn 1 worker = 5 bước rời rạc ở 5 nơi** (dispatch-loop.ts line 165–290):
   - `workerRegistry.register()` → tạo WorkerInfo record
   - `workerRegistry.assignTask()` → bind task
   - `runtimeManager.spawn()` → tạo lease + spawn process
   - `new ActiveHarness(...)` → track completion
   - `this.activeHarnesses.set(...)` → lưu vào local map

2. **Kill 1 worker = spray-and-pray** (runtime-manager.ts):
   - `processManager.kill(pid)` — kill process
   - `ollamaRuntime.releaseLease()` — release Ollama
   - `codexCliRuntime.kill()` — kill Codex (dù có thể không phải Codex)
   - `agCliRuntime.kill()` — kill AG (dù có thể không phải AG)

3. **Detect alive/dead = 3 nơi check khác nhau**:
   - `processManager.getActive()` → check PID
   - `heartbeatStore.get()` → check heartbeat timestamp
   - `codexCliRuntime.isAlive()` / `agCliRuntime.isAlive()` → check session

4. **State không nhất quán**: `WorkerInfo.status = IDLE` nhưng `ActiveHarness.completionAccepted = false` nhưng `RuntimeLease.status = ACTIVE`

---

## 3. Target Architecture

### 3.1. WorkerNode — 1 entity hoàn chỉnh

```typescript
/**
 * WorkerNode = 1 service node.
 * Tương đương 1 Docker container / 1 backend process.
 * Sở hữu toàn bộ lifecycle, identity, và processors.
 */
interface WorkerNode {
  // ── Identity ──
  readonly identity: WorkerIdentity;
  
  // ── Lifecycle ──
  readonly status: WorkerStatus;
  readonly lifecycle: WorkerLifecycle;
  
  // ── Backend ──
  readonly backend: WorkerBackend;
  
  // ── Task ──
  readonly taskBinding: TaskBinding | null;
  
  // ── Control ──
  kill(): void;
  isAlive(): boolean;
  getHeartbeat(): WorkerHeartbeat;
  
  // ── Completion ──
  readonly completion: Promise<WorkerOutcome>;
}
```

### 3.2. WorkerIdentity — Định danh

```typescript
interface WorkerIdentity {
  worker_id: string;           // w-xxxxxxxx
  runtime_id: string;          // worker_id:task_id:generation
  lease_generation: number;    // reject stale signals
  workspace_id: string;        // workspace scope
  created_at: string;
}
```

### 3.3. WorkerStatus — State machine

```typescript
type WorkerStatus = 
  | 'spawning'     // Process đang start
  | 'ready'        // Process alive, chờ nhận payload
  | 'running'      // Đang execute task
  | 'completing'   // Đã gửi result, chờ server acknowledge
  | 'done'         // Completed successfully
  | 'failed'       // Completed with error
  | 'killed'       // Bị server kill (timeout, stale, shutdown)
  ;

// Valid transitions:
// spawning → ready | failed
// ready → running
// running → completing | failed | killed
// completing → done | failed
// Any → killed (forced)

// NGUYÊN TẮC: spawning → ready PHẢI là verified transition.
// Worker spawn xong → health check → pass → ready.
// Health check fail → failed. Không có "hy vọng chạy được".
// 1 Worker mà không chứng minh được nó ready = failed Worker.
// Server không bao giờ giao task cho Worker chưa ở trạng thái ready.
```

### 3.4. WorkerBackend — Loại backend

```typescript
type WorkerBackendType = 'ollama' | 'codex_cli' | 'ag_cli' | 'gemini_api';

interface WorkerBackend {
  type: WorkerBackendType;
  model: string;
  
  // Ollama-specific
  endpoint_url?: string;
  
  // CLI-specific  
  command?: string;
  args?: string[];
  
  // Capacity
  estimated_vram_mb: number;  // 0 for cloud
}
```

### 3.5. WorkerLifecycle — Lifecycle tracking

```typescript
interface WorkerLifecycle {
  spawned_at: string;
  ready_at?: string;
  running_at?: string;
  completed_at?: string;
  killed_at?: string;
  
  // Heartbeat
  last_heartbeat_at: string;
  stale_at: string;
  next_health_check_at: string;
  
  // Process
  pid: number;
  exit_code?: number | null;
  exit_signal?: string | null;
}
```

### 3.6. WorkerManager — Quản lý collection

```typescript
/**
 * Thay thế: WorkerRegistry + ActiveHarness map + RuntimeManager (phần spawn/kill)
 * 
 * Server chỉ tương tác với WorkerManager.
 * WorkerManager tạo, track, và cleanup WorkerNodes.
 */
class WorkerManager {
  private nodes = new Map<string, WorkerNode>();
  
  /**
   * Spawn 1 worker node hoàn chỉnh.
   * Input: task + routing decision (backend type + model).
   * Output: WorkerNode ready to monitor.
   */
  spawn(input: WorkerSpawnInput): WorkerNode;
  
  /** Get node by worker_id */
  get(workerId: string): WorkerNode | null;
  
  /** Get all active (alive) nodes */
  getActive(): WorkerNode[];
  
  /** Kill a specific node */
  kill(workerId: string): void;
  
  /** Kill all nodes (shutdown) */
  killAll(): void;
  
  /** Validate completion signal (lease generation check) */
  acknowledgeCompletion(workerId: string, identity: WorkerIdentity): boolean;
  
  /** Count by backend type */
  countByBackend(backend: WorkerBackendType): number;
}
```

---

## 4. Dispatch Flow mới

### Hiện tại (rải rác):
```
DispatchLoop.dispatchTask()
  1. stateManager.moveToActive(task)              ← server domain
  2. modelSelector.selectProfile(task)             ← Ollama-only
  3. workerRegistry.register(workspaceId)           ← tạo record
  4. compute runtimeIdentity                        ← inline
  5. hardcode runtimeBackend = OLLAMA               ← hardcode
  6. workerRegistry.assignTask()                    ← update record
  7. runtimeManager.spawn()                         ← lease + process
  8. new ActiveHarness(...)                         ← track object
  9. this.activeHarnesses.set(...)                  ← local map
  10. this.monitorHarness(...)                       ← await completion
  
  = 10 steps, 5 objects, 3 domains mixed
```

### Target (gom vào WorkerManager):
```
DispatchLoop.dispatchTask()
  1. stateManager.moveToActive(task)              ← server domain
  2. scheduler.decideRouting(task, capacity)       ← returns backend + model
  3. workerManager.spawn({ task, routing })        ← 1 call = 1 WorkerNode
     ├── Creates WorkerIdentity
     ├── Creates correct backend adapter (Ollama/Codex/AG)
     ├── Reserves capacity (points)
     ├── Spawns process
     ├── Records heartbeat
     └── Returns WorkerNode with completion promise
  4. monitorWorker(node)                           ← await node.completion
  
  = 4 steps, 1 object, clear ownership
```

---

## 5. Files Impact

### Delete / Major Rewrite:
| File | Reason |
|------|--------|
| `utils/worker-registry.ts` | Replaced by `worker/worker-manager.ts` |
| `worker/dispatch-loop.ts` | Stripped down to loop + delegate to WorkerManager |
| `runtime/runtime-manager.ts` | Spawn/kill logic moves into WorkerManager |
| `worker/model-selector.ts` | Replaced by `scheduler/backend-router.ts` |

### Keep (with minor changes):
| File | Change |
|------|--------|
| `runtime/heartbeat-store.ts` | Used by WorkerManager internally |
| `runtime/lease-validator.ts` | Used by WorkerManager internally |
| `runtime/point-allocator.ts` | Used by WorkerManager internally |
| `runtime/runtime-registry.ts` | Used by WorkerManager internally |
| `worker/process-manager.ts` | Used by WorkerManager to spawn processes |
| `harness/runner.ts` | Read backend from payload instead of hardcode |

### New Files:
| File | Purpose |
|------|---------|
| `worker/worker-node.ts` | WorkerNode interface + implementation |
| `worker/worker-manager.ts` | WorkerManager — replaces registry + dispatch spawn logic |
| `worker/worker-factory.ts` | Create correct WorkerNode by backend type |
| `scheduler/backend-router.ts` | Decide backend type + model for a task |

### Move:
| From | To | Reason |
|------|-----|--------|
| `worker/adapters/ollama-adapter.ts` | `runtime-adapters/ollama/ollama-adapter.ts` | LLM adapter = infra concern |
| `worker/adapters/gemini-adapter.ts` | `runtime-adapters/gemini/gemini-adapter.ts` | Same |
| `worker/adapters/llm-adapter.ts` | `runtime-adapters/llm-adapter.ts` | Shared interface |
| `worker/vram-manager.ts` | `infra/vram-manager.ts` | VRAM = infra concern |

---

## 6. Execution Order

> [!IMPORTANT]
> Thứ tự quan trọng — mỗi step phải compile + chạy được trước khi làm step sau.

### Phase A: Foundation (không phá code cũ)
1. Tạo `worker/worker-node.ts` — interfaces + types
2. Tạo `scheduler/backend-router.ts` — routing decision logic
3. Tạo `worker/worker-factory.ts` — factory cho các backend types

### Phase B: WorkerManager (thay thế dần)
4. Tạo `worker/worker-manager.ts` — ban đầu wrap WorkerRegistry + RuntimeManager
5. Sửa `dispatch-loop.ts` — dùng WorkerManager thay vì 5 objects riêng lẻ

### Phase C: Harness decouple (backend-agnostic)
6. Sửa `harness/runner.ts` — đọc backend type từ payload
7. Sửa `worker/adapters/index.ts` — createAdapter dựa trên backend field

### Phase D: File moves + cleanup
8. Move adapter files → runtime-adapters/
9. Move vram-manager → infra/
10. Remove old WorkerRegistry singleton
11. Update workspace-memory.md + dependency graph

### Phase E: Multi-backend dispatch
12. Sửa dispatch loop — không hardcode OLLAMA
13. Backend health check per-type
14. Concurrent workers across backends (Ollama slots + cloud slots riêng)

---

## 7. Architecture Invariant: Harness Boundary

> **RULE: Không có Worker nào tương tác trực tiếp với Server. Chỉ có Harness ↔ Server.**

```
┌──────────┐         ┌──────────┐         ┌──────────────────┐
│  Server  │ ◄─────► │ Harness  │ ◄─────► │ Worker (LLM/CLI) │
│  (Head)  │         │ (Limb)   │         │ (Body)           │
└──────────┘         └──────────┘         └──────────────────┘
     ▲                    ▲                       ▲
     │                    │                       │
  Owns state         Owns lifecycle          Chỉ biết task
  Owns dispatch      Owns communication      Dùng tools do
  Owns recovery      Owns completion           Harness cung cấp
                     Reports to Server       KHÔNG biết Server
```

### Core Identity

> **1 Harness = 1 Worker = 1 Service.** Ba tên gọi, một thực thể.
> Server có thể chạy **N services song song**, mỗi service có thể là **loại khác nhau** (Ollama, Codex CLI, AG CLI, Gemini API).

```
Server manages:
  ├── Harness #1 (Ollama, qwen3.5:4b)    ← service 1
  ├── Harness #2 (Ollama, qwen3.5:9b)    ← service 2
  ├── Harness #3 (Codex CLI)              ← service 3
  └── Harness #4 (Gemini API)             ← service 4
  
  Mỗi cái = 1 worker = 1 service = 1 identity = 1 task tại 1 thời điểm
  Các services KHÔNG biết nhau — mỗi thằng 1 vùng trời riêng
```

### Áp dụng cho mỗi backend:

| Backend | Worker process | Worker ↔ Harness | Harness ↔ Server |
|---------|---------------|-------------------|-------------------|
| **Ollama** | LLMHarness loop (bên trong harness process) | Internal — cùng process | Callback URL |
| **Codex CLI** | `codex` subprocess | Harness cung cấp tools/interface cho CLI giao tiếp | Callback URL |
| **AG CLI** | `ag` subprocess | Harness cung cấp tools/interface cho CLI giao tiếp | Callback URL |
| **Gemini API** | LLMHarness loop (bên trong harness process) | Internal — cùng process | Callback URL |

### Hệ quả thiết kế:

1. **MCP tools hiện tại** (`complete_task`, `register_worker`, `report_progress`) là **server-level tools** cho planner/external agents — KHÔNG phải cho workers.
2. **Workers** nhận tools từ Harness (file read/write, exec, etc.) — không bao giờ gọi server API.
3. **Harness** là nơi duy nhất gọi callback URL về server. Worker chỉ return kết quả cho Harness.
4. **CLI backends** (Codex, AG): Harness wrap CLI subprocess, cung cấp interface/tools cho CLI tương tác, monitor process, rồi Harness report kết quả về Server qua callback.

---

## 8. Câu hỏi còn lại cần owner quyết

~~1. **Codex CLI / AG CLI completion**: Đã resolved — Harness wrap CLI, cung cấp tools, report về server.~~

~~2. **Docker isolation**: Đã resolved — giữ child process, đảm bảo chạy đúng hướng trước, Docker improve sau.~~

~~3. **MCP tools redesign**: Đã resolved — cần redesign vì out of date. 3 vai trò rạch ròi:~~

### Planner (MCP client — chỉ active khi được gọi, không idle)
| Tool | Mô tả |
|------|--------|
| `register` | Đăng ký planner session |
| `init_skill` | Tạo skill nếu chưa có |
| `get_plan_skill` | Lấy skill cho plan nếu chưa có |
| `update_plan` | Phân tích plan → gọi update |
| `break_task` | Decompose plan → tasks |
| `analyze_report` | Phân tích report từ workers |
| `create_experience` | Tạo experience/skill dựa trên report |

### Server (internal — không expose qua MCP cho worker)
- **CRUD Harness**: spawn, monitor, kill
- **Assign task** → Harness
- **Nhận signals từ Harness**: task result (done/failed/summary), heartbeat (alive/dead)
- Task routing: task nào → harness nào
- Capacity accounting
- **KHÔNG care** bên trong Harness làm gì (model nào, tool nào, bao nhiêu LLM turn)

### Harness (subprocess — black box từ góc nhìn Server)
- Nhận task payload từ Server → tự xử lý (LLM loop, CLI, tools, etc.)
- **Report về Server**: task result + heartbeat
- Bên trong làm gì là việc của Harness — Server không biết và không cần biết
- KHÔNG dùng MCP tools — dùng callback URL

### Hệ quả: MCP tools hiện tại cần thay đổi
| Tool hiện tại | Vấn đề | Hướng xử lý |
|---------------|--------|-------------|
| `register_worker` | Worker không nên gọi server | Remove — Harness tự register qua callback |
| `complete_task` | Worker tool nhưng nên là callback | Remove — chỉ dùng callback URL |
| `report_progress` | Worker tool | Remove — Harness report qua callback |
| `submit_task` | Planner tool ✓ | Giữ — redesign input schema |
| `submit_decomposition` | Planner tool ✓ | Giữ — redesign thành `break_task` |
| `get_status` | Planner tool ✓ | Giữ |
| `get_queue_status` | Planner tool ✓ | Giữ |
| `ping` | Worker keepalive | Remove — Harness heartbeat tự động |
