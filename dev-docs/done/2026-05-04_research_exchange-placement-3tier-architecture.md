# Exchange Architecture Analysis — Final v3

## Bối cảnh

Phân tích xem thành phần `exchange/`, `plan/`, `tasks/` nên nằm ở **orchestrator** hay **workspace**, với mục tiêu:
- Orchestrator là "pure engine" — không chứa data riêng của dự án
- Hỗ trợ multi-workspace từ đầu (không bolt-on sau)
- Agent tương tác qua MCP tools, không đọc file trực tiếp

---

## Consensus đạt được

| Nguyên tắc | Đồng thuận |
|------------|-----------|
| Orchestrator source ≠ runtime data | ✅ |
| Worker mgmt, logs → orchestrator | ✅ |
| Plan, tasks (project-specific) → workspace | ✅ |
| Agent đọc task qua MCP, không trực tiếp | ✅ |
| Multi-workspace phải support từ đầu | ✅ |
| Exchange pipeline (inbox→active→outbox) → orchestrator runtime owns lifecycle | ✅ |

---

## Phân tích từng component (dựa trên source code thực tế)

### Hiện trạng code

```
loadConfig() → root = resolve(__dirname, '..')  ← tất cả path resolve từ orchestrator root
  ├── exchange.base    = root/exchange
  ├── exchange.inbox   = root/exchange/inbox     ← StateManager.storeTasks() ghi task-*.json
  ├── exchange.active  = root/exchange/active    ← StateManager.moveToActive() move files
  ├── exchange.outbox  = root/exchange/outbox    ← StateManager.moveToOutbox() + result-*.json
  ├── plans.pending    = root/plan/pending       ← PlanWatcher quét mỗi 30s
  ├── plans.processing = root/plan/processing    ← StateManager.checkPlans() move plan vào đây
  └── plans.done       = root/plan/done          ← StateManager.completePlan() khi decompose xong
```

**Vấn đề**: Mọi thứ đều resolve từ `root` = thư mục orchestrator. Không có khái niệm workspace nào trong config path.

---

### Bảng phân loại chi tiết

#### 🔴 100% Orchestrator — Không bàn cãi

| Component | File liên quan | Chức năng | Lý do |
|-----------|---------------|-----------|-------|
| `workers.json` | `WorkerRegistry` (in-memory, không persist hiện tại) | Registry worker IDs, heartbeat, roles | Worker là concept global, không thuộc workspace nào |
| `.shutdown_clean` | `RecoveryManager._markerPath` | Marker clean/unclean shutdown | Internal recovery flag |
| `checkpoints/` | `StateManager.saveCheckpoint()` | Queue snapshots (DAG + tasks serialize) | Orchestrator self-recovery |
| `signals/` | `StateManager.writeRecoverySignal()` | `recovery-needed.json` cho stale workers | Internal signaling |
| `logs/` | `Logger` → ghi `YYYY-MM-DD.md` | Orchestrator event timeline | Operational log — ai làm gì lúc nào, thuộc orchestrator |

#### 🟢 100% Workspace — Đồng thuận

| Component | File liên quan | Chức năng | Lý do |
|-----------|---------------|-----------|-------|
| `plan/pending/` | User tạo `.md` files | Mô tả feature/bug CỦA project | User tạo plan cho project cụ thể → thuộc project |
| `tasks/` (dev board) | `.agent/workflows/pick-task.md` | Manual dev workflow: pending→processing→done | Dev task board, không liên quan orchestrator engine |
| `.agent/session.json` | `session-checkpoint.ts` | Agent resume state | Session thuộc workspace agent đang làm việc |

#### 🟡 Hybrid — Task pipeline (đây là phần core cần thiết kế)

| Component | Nội dung file thực tế | Workspace concern | Orchestrator concern |
|-----------|----------------------|-------------------|---------------------|
| `inbox/task-*.json` | `{id, module, action, verification, status}` | `module`, `action`, `verification` = project-specific | `status` = lifecycle state |
| `active/task-*.json` | Same + `status: "active"` | Content vẫn project-specific | File ở đây = đang xử lý |
| `outbox/task-*.json` | Same + `status: "done"` | Content + kết quả = project cần biết | Lifecycle state |
| `outbox/result-*.json` | `{task_id, status, summary, worker_id, completed_at}` | `summary` = project muốn biết | `worker_id` = orchestrator concept |
| `_queue.json` | `{groups: [{group_id, tasks, depends_on}]}` | Task IDs chứa plan name prefix | DAG structure = orchestrator quản lý |
| `plan/processing/` | Plan `.md` đang được decompose | Content = project-specific | Lifecycle position (processing/) = orchestrator manages |
| `plan/done/` | Plan `.md` đã xong | Archive thuộc project | — |

---

## Kiến trúc đề xuất: 3-Tier với Workspace-Scoped Exchange

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1: ORCHESTRATOR SOURCE (git-tracked, immutable, ship)      │
│  agent-orchestrator/                                              │
│  ├── src/              ← TypeScript source code                   │
│  ├── templates/        ← Task/plan templates (reference)          │
│  ├── prompts/          ← Agent prompt templates                   │
│  ├── reference/        ← Tools, skills, context docs              │
│  ├── tests/            ← E2E tests                                │
│  └── dev-docs/         ← Dev documentation (không ship prod)      │
│                                                                    │
│  ❌ KHÔNG CÒN: exchange/, plan/, tasks/                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TIER 2: ORCHESTRATOR RUNTIME (auto-created, NOT git-tracked)    │
│  ~/.orchestrator/   (hoặc configurable via env/cli)               │
│                                                                    │
│  ├── workers.json              ← Global worker registry           │
│  ├── logs/                     ← Global operational logs          │
│  │   └── YYYY-MM-DD.md                                            │
│  ├── .shutdown_clean           ← Recovery marker                  │
│  │                                                                 │
│  └── workspaces/               ← Per-workspace isolation          │
│      └── <workspace-id>/       ← Hash hoặc slug từ workspace path │
│          ├── pipeline/                                             │
│          │   ├── inbox/        ← Task files chờ xử lý             │
│          │   ├── active/       ← Task files đang làm              │
│          │   └── outbox/       ← Task files + results hoàn thành  │
│          ├── queue.json        ← DAG state riêng cho workspace    │
│          ├── checkpoints/      ← Recovery snapshots               │
│          └── plans/                                                │
│              ├── processing/   ← Plan đang decompose              │
│              └── done/         ← Plan đã xong (archive)           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TIER 3: WORKSPACE (project-owned, project git-tracked)          │
│  ~/projects/my-app/                                               │
│  ├── .agent/                                                      │
│  │   ├── plans/                                                   │
│  │   │   └── pending/          ← USER ĐẶT PLAN Ở ĐÂY            │
│  │   ├── tasks/                ← Dev task board (manual workflow) │
│  │   │   ├── pending/                                             │
│  │   │   ├── processing/                                          │
│  │   │   └── done/                                                │
│  │   ├── results/              ← Orchestrator GHI NGƯỢC kết quả  │
│  │   ├── session.json          ← Agent session state              │
│  │   └── workspace-memory.md   ← Workspace scan result           │
│  └── src/                      ← Project source code              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow mới

```
USER tạo plan
     │
     ▼
workspace/.agent/plans/pending/feature-x.md        ← [TIER 3] User drops file
     │
     ▼  PlanWatcher quét registered workspaces
~/.orchestrator/workspaces/<ws>/plans/processing/   ← [TIER 2] Orchestrator picks up
     │
     ▼  Planner agent decompose (qua MCP)
~/.orchestrator/workspaces/<ws>/pipeline/inbox/     ← [TIER 2] Tasks created
~/.orchestrator/workspaces/<ws>/queue.json          ← [TIER 2] DAG stored
~/.orchestrator/workspaces/<ws>/plans/done/         ← [TIER 2] Plan archived
     │
     ▼  Worker agent nhận task (qua get_next_task MCP)
~/.orchestrator/workspaces/<ws>/pipeline/active/    ← [TIER 2] Task assigned
     │
     ▼  Worker hoàn thành (qua complete_task MCP)
~/.orchestrator/workspaces/<ws>/pipeline/outbox/    ← [TIER 2] Task + result stored
     │
     ▼  Orchestrator sync ngược
workspace/.agent/results/result-01.json             ← [TIER 3] User xem kết quả
```

---

## Code Impact Analysis

### Modules cần thay đổi

| Module | Hiện tại | Cần thay đổi |
|--------|---------|--------------|
| **`config.ts`** | `root = __dirname/..`, mọi path hardcode | Thêm `runtimeRoot` (mặc định `~/.orchestrator/`). Exchange paths resolve từ `runtimeRoot` thay vì `root`. Thêm workspace registration với `workspaceId`. |
| **`models/config.ts`** | `AppConfig` chứa 1 bộ exchange paths | Tách `GlobalConfig` (workers, logs) vs `WorkspaceConfig` (pipeline, queue, plans). AppConfig aggregate cả hai. |
| **`state-manager.ts`** | Hardcode 1 bộ inbox/active/outbox paths | Constructor nhận `WorkspaceConfig` thay vì `AppConfig`. **Hoặc**: tạo `WorkspaceStateManager` per-workspace, `GlobalStateManager` cho global concerns. |
| **`plan-watcher.ts`** | Quét 1 thư mục `plans.pending` | Quét **tất cả registered workspaces** `workspace/.agent/plans/pending/`. Khi phát hiện plan → copy/move vào runtime `~/.orchestrator/workspaces/<ws>/plans/processing/`. |
| **`recovery.ts`** | Quét 1 bộ active/outbox | Quét per-workspace `pipeline/active/`. Logic giữ nguyên, chỉ thay đổi path resolution. |
| **`tools.ts` — register_worker** | Nhận `workspace_path`, lưu vào config | Cần trigger **workspace registration**: tạo `~/.orchestrator/workspaces/<ws>/` structure, bắt đầu watch plan directory. |
| **`tools.ts` — get_next_task** | Lấy từ 1 queue | Lấy từ queue CỦA workspace mà worker đang phục vụ. Cần mapping `worker_id → workspace_id`. |
| **`tools.ts` — complete_task** | Ghi vào 1 outbox | Ghi vào outbox CỦA workspace + sync result ngược workspace. |
| **`bootstrap.ts`** | Tạo exchange/ dirs ở root | Tạo `~/.orchestrator/` structure + per-workspace dirs khi register. |

### Modules KHÔNG cần thay đổi

| Module | Lý do |
|--------|-------|
| `task-queue.ts` | Pure in-memory DAG logic, path-agnostic |
| `poll-helpers.ts` | Chỉ dùng `TaskQueue` events, path-agnostic |
| `idle-resolver.ts` | Logic quyết định role, path-agnostic |
| `transport.ts` | HTTP transport, không liên quan data path |
| `server.ts` | Express setup, không liên quan |

---

## Vấn đề thiết kế cần giải quyết

### 1. Workspace Identity: Hash hay slug?

```
# Option A: Path hash
~/.orchestrator/workspaces/a1b2c3d4/     ← SHA256(absolutePath).slice(0,8)

# Option B: Slugified path
~/.orchestrator/workspaces/home-user-projects-my-app/

# Option C: User-defined name
~/.orchestrator/workspaces/my-app/       ← từ register_worker param
```

> **Khuyến nghị**: Option A (hash) + metadata file chứa human-readable name. Slug dễ collision, user-defined dễ trùng.

### 2. Worker ↔ Workspace binding

Hiện tại `register_worker(workspace_path?)` optional. Cần quyết định:

| Approach | Ưu | Nhược |
|----------|---|-------|
| **1:1** — Mỗi worker gắn 1 workspace | Đơn giản, clear ownership | Worker không thể phục vụ nhiều workspace |
| **1:N** — Worker phục vụ nhiều workspace | Flexible | Queue priority phức tạp hơn |
| **N:1** — Nhiều worker cùng 1 workspace | Tận dụng parallelism | Đã hỗ trợ hiện tại |

> **Khuyến nghị**: **N:1** ngắn hạn (nhiều workers, 1 workspace — đã hoạt động). Thiết kế data model cho **1:1 binding** nhưng mở cửa cho 1:N sau.

### 3. Plan sync: Copy hay Move?

Khi PlanWatcher phát hiện plan ở `workspace/.agent/plans/pending/`:

| Approach | Pro | Con |
|----------|-----|-----|
| **Move** file sang runtime | Workspace sạch, không duplicate | User mất file gốc nếu cần reference |
| **Copy** file sang runtime, **mark** original | User giữ được file gốc | Cần sync status ngược (hoặc dùng `.processed` marker) |
| **Symlink** | Không duplicate, file vẫn ở workspace | OS-dependent, Windows problematic |

> **Khuyến nghị**: **Copy** + đổi tên original thêm prefix `[PROCESSING]` hoặc move sang `workspace/.agent/plans/processing/`. User vẫn thấy plan đang được xử lý.

### 4. Result sync ngược workspace

Khi task hoàn thành, orchestrator cần ghi kết quả về workspace:

```json
// workspace/.agent/results/feature-x-01-create-login.json
{
  "task_id": "feature-x-01-create-login",
  "status": "done",
  "summary": "Created login page with form validation",
  "completed_at": "2026-05-04T10:30:00Z"
  // worker_id KHÔNG ghi — workspace không cần biết
}
```

> Timing: Ghi ngay khi `complete_task()` được gọi. Nếu workspace path không accessible → log warning, không fail.

---

## Tóm tắt quyết định

| # | Quyết định | Chọn |
|---|-----------|------|
| 1 | Runtime data location | `~/.orchestrator/` (configurable) |
| 2 | Workspace isolation | Per-workspace subdirectory bằng path hash |
| 3 | Plan input | User tạo ở `workspace/.agent/plans/pending/` |
| 4 | Plan lifecycle | Orchestrator copy → runtime, xử lý bên runtime |
| 5 | Task pipeline | Hoàn toàn ở runtime per-workspace |
| 6 | Task results | Orchestrator ghi ngược workspace `.agent/results/` |
| 7 | Worker binding | N:1 (nhiều worker → 1 workspace), data model cho 1:1 |
| 8 | Logs | Global ở `~/.orchestrator/logs/` |
| 9 | Workers registry | Global ở `~/.orchestrator/workers.json` |
