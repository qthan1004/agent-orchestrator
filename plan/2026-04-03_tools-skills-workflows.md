# Tools / Skills / Workflows — Phân loại & Chuẩn hóa

> **Mục đích**: Phân loại tất cả assets, xác định cái nào giữ/sửa/tạo mới  
> **Ngày**: 2026-04-03

---

## 1. Phân loại Assets hiện có

### 1.1 Skills (reference/skills/) — 8 skills

| # | Skill | Loại | Dùng cho Orchestrator? |
|---|-------|------|------------------------|
| 1 | `task-delegation/` | **Orchestrator-core** | ✅ **EVOLVE** → `orchestrator-protocol/` |
| 2 | `strict-scope/` | **Generic** | ✅ Worker agents PHẢI đọc khi execute task |
| 3 | `token-optimization/` | **Generic** | ✅ Tất cả agents cần tuân thủ |
| 4 | `component-patterns/` | Project-specific | ❌ Chỉ cho React monorepo |
| 5 | `styled-theme-convention/` | Project-specific | ❌ Chỉ cho styled-components |
| 6 | `testing-patterns/` | Project-specific | ❌ Chỉ cho testing monorepo |
| 7 | `git-commit-convention/` | **Generic** | ✅ Workers commit theo convention |
| 8 | `check-deps/` | Project-specific | ❌ Chỉ cho NX monorepo |

### 1.2 Workflows (reference/workflows/) — 11 workflows

| # | Workflow | Loại | Dùng cho Orchestrator? |
|---|---------|------|------------------------|
| 1 | `delegate.md` | **Orchestrator-core** | ✅ **EVOLVE** → `decompose-plan.md` |
| 2 | `execute-task.md` | **Orchestrator-core** | ✅ **EVOLVE** → `worker-protocol.md` |
| 3 | `pick-task.md` | **Orchestrator-core** | ✅ **EVOLVE** → tích hợp MCP `get_next_task()` |
| 4 | `save-plan.md` | **Generic** | ✅ Giữ nguyên |
| 5 | `save-bug-report.md` | **Generic** | 🟡 Optional — khi worker gặp bug |
| 6 | `git-push.md` | **Generic** | ✅ Sau khi task complete |
| 7 | `publish-lib.md` | Project-specific | ❌ |
| 8 | `create-lib.md` | Project-specific | ❌ |
| 9 | `test-lib.md` | Project-specific | ❌ |
| 10 | `check-deps.md` | Project-specific | ❌ |
| 11 | `clear-nexus.md` | Project-specific | ❌ |

### 1.3 Tools (reference/tools/) — 9 scripts

| # | Tool | Loại | Dùng cho Orchestrator? |
|---|------|------|------------------------|
| 1 | `git-push.sh` | **Generic** | ✅ |
| 2 | `git-setup-lib.sh` | Project-specific | ❌ |
| 3-9 | Còn lại | Project-specific | ❌ |

---

## 2. Mapping: Cũ → Mới (Orchestrator Evolution)

### 2.1 `task-delegation/` → `orchestrator-protocol/`

| Cũ (Manual) | Mới (MCP-based) |
|-------------|-----------------|
| Worker paste prompt trong Chat mới | Worker gọi `MCP.get_next_task()` |
| Ticket ở `plan/tasks/todo/` | Task ở `exchange/inbox/` |
| Worker tự đọc file `cat plan/tasks/todo/NN.md` | Worker đọc `view_file("exchange/active/NN.task.json")` |
| Move `todo/ → done/` bằng `mv` command | MCP Server move `inbox → active → outbox` |
| Blocker = move sang `plan/tasks/blocked/` | MCP `complete_task(status: "blocked")` |

**Giữ nguyên**:
- 1 ticket = 1 concern
- Self-contained tasks
- Dependency order
- Verification command bắt buộc
- Done Criteria

### 2.2 `execute-task.md` → `worker-protocol.md`

| Step | Cũ | Mới |
|------|-----|------|
| 1 | User paste task name | Agent gọi `MCP.get_next_task()` |
| 2 | `cat .agent/skills/...` | Đọc `SKILL.md` 1 lần đầu session |
| 3 | `cat plan/tasks/todo/NN.md` | `view_file("exchange/active/NN.task.json")` |
| 4 | Đọc skills bổ sung | Giữ nguyên |
| 5 | Implement | Giữ nguyên |
| 6 | Verify | Giữ nguyên |
| 7 | `mv todo/ → done/` | `MCP.complete_task()` → server move file |
| 8 | Báo user | `MCP.report_progress()` + báo user |

### 2.3 `delegate.md` → `decompose-plan.md`

| Step | Cũ | Mới |
|------|-----|------|
| 1 | `cat task-delegation/SKILL.md` | `cat orchestrator-protocol/SKILL.md` |
| 2 | Nhận yêu cầu từ user | Gọi `MCP.get_plan_for_decomposition()` |
| 3 | Kiểm tra plan/ | Plan đã load trong MCP state |
| 4 | Phân tích & phân rã | Giữ nguyên (Claude decide) |
| 5 | Đọc template | Template = `task.template.json` |
| 6 | Tạo ticket files | `MCP.submit_decomposition(tasks[])` |
| 7 | Báo user | MCP tự validate + build queue |

---

## 3. Inventory của Orchestrator — Tất cả cần chuẩn bị

### 3.1 Skills (`.agent/skills/`)

| # | Skill | Mục đích | Priority |
|---|-------|----------|----------|
| 1 | `orchestrator-protocol/SKILL.md` | **Master protocol**: connect MCP → pull → execute → complete | 🔴 Cao |
| 2 | `strict-scope/SKILL.md` | Link từ reference (symlink/copy) — worker tuân thủ scope | 🟡 |
| 3 | `token-optimization/SKILL.md` | Link từ reference — token management | 🟡 |
| 4 | `git-commit-convention/SKILL.md` | Link từ reference — commit format | 🟢 |

#### `orchestrator-protocol/SKILL.md` — Nội dung chính:

```markdown
---
name: Orchestrator Protocol
description: Protocol for agents to connect to MCP Orchestrator, pull tasks, execute, and report results.
---

# Orchestrator Protocol

Bạn là Agent trong hệ thống Orchestrator. Tuân thủ protocol sau:

## 1. Kết nối
- MCP Server "orchestrator" đã được config sẵn
- Gọi `mcp__orchestrator__get_queue_status()` để xác nhận connection

## 2. Xác định vai trò
- Nếu queue chưa có tasks → bạn là **Decomposer** (xem Section A)
- Nếu queue đã có tasks → bạn là **Worker** (xem Section B)

## Section A — Decomposer Role
1. Gọi `mcp__orchestrator__get_plan_for_decomposition()`
2. Đọc plan file bằng `view_file(plan_file_path)`
3. Phân tích plan → chia thành atomic tasks
4. Constraints: max 20 tasks, mỗi task phải có id/module/action/verification
5. Gọi `mcp__orchestrator__submit_decomposition(tasks, graph, reasoning)`
6. Nếu rejected → fix errors → submit lại
7. Khi accepted → chuyển sang Worker Role

## Section B — Worker Role (Loop)
1. Gọi `mcp__orchestrator__get_next_task(worker_id)` 
   - worker_id = unique ID cho session này
2. Nếu `null` → tất cả tasks done → thông báo user → DỪNG
3. Nhận {task_id, file_path}
4. Đọc task file: `view_file(file_path)` ← TOKEN-EFFICIENT!
5. Đọc các skills liệt kê trong task.constraints
6. Implement theo task.what_to_do
7. Chạy task.verification command
8. Gọi `mcp__orchestrator__complete_task(task_id, status, summary)`
9. Quay lại Step 1 (lấy task tiếp)

## Khi gặp blocker
- Gọi `complete_task(task_id, "blocked", reason)`
- MCP sẽ skip task, cho task tiếp theo
- User review blocker sau

## Rules
- ❌ KHÔNG sửa file ngoài scope task
- ❌ KHÔNG tạo task mới
- ❌ KHÔNG đọc/sửa task của agent khác
- ✅ CHỈ verify bằng command trong task
- ✅ Report progress cho tasks dài: `mcp__orchestrator__report_progress()`
```

### 3.2 Workflows (`.agent/workflows/`)

| # | Workflow | Trigger | Mục đích |
|---|---------|---------|----------|
| 1 | `start-server.md` | `/start-server` | Khởi động MCP Server + verify |
| 2 | `orchestrate.md` | `/orchestrate` | Full flow: load plan → decompose → execute |
| 3 | `worker.md` | `/worker` | Chỉ worker mode: pull → execute → complete loop |
| 4 | `decompose-plan.md` | `/decompose` | Chỉ decompose: parse plan → submit tasks |
| 5 | `status.md` | `/status` | Xem queue status + progress |

#### `start-server.md` — Auto-start script:

```markdown
---
description: Start the MCP Orchestrator Server and verify connection
---

# Start Server

## Step 1 — Check if server already running
// turbo
```bash
curl -s http://localhost:3847/health || echo "NOT_RUNNING"
```

## Step 2 — Start server (if not running)
```bash
cd "<project_root>" && node src/index.mjs serve --port 3847 &
```

## Step 3 — Wait and verify
// turbo
```bash
sleep 2 && curl -s http://localhost:3847/health
```

Nếu response OK → Server ready. 
Nếu FAIL → kiểm tra port conflict / Node.js version.
```

#### `worker.md`:

```markdown
---
description: Worker mode — connect MCP, pull tasks, execute in loop
---

# Worker Mode

## Prerequisites
// turbo
1. Đọc orchestrator protocol:
```bash
cat ".agent/skills/orchestrator-protocol/SKILL.md"
```

## Step 1 — Verify MCP connection
Gọi `mcp__orchestrator__get_queue_status()` 
Nếu FAIL → chạy `/start-server` trước.

## Step 2 — Worker loop
Thực hiện Section B của Orchestrator Protocol (trong SKILL.md đã đọc):
- Pull → Read file → Execute → Complete → Repeat
```

### 3.3 MCP Tools (exposed by server)

| Category | Tool | In/Out | Token cost |
|----------|------|--------|------------|
| **Core** | `get_next_task(worker_id)` | → `{task_id, file_path}` | 🟢 Rất nhỏ |
| **Core** | `complete_task(task_id, status, summary)` | → `{accepted, next_unlocked}` | 🟢 Nhỏ |
| **Core** | `report_progress(task_id, step, %)` | → void | 🟢 Rất nhỏ |
| **Core** | `get_queue_status()` | → `{total, done, active, blocked}` | 🟢 Nhỏ |
| **Core** | `get_checkpoint()` | → `{checkpoint_file_path}` | 🟢 Rất nhỏ |
| **Decompose** | `get_plan_for_decomposition()` | → `{plan_file, template_file}` | 🟢 Rất nhỏ |
| **Decompose** | `submit_decomposition(tasks[], graph)` | → `{accepted, errors}` | 🟡 Trung bình |
| **Recovery** | `request_retry(task_id, reason, attempt)` | → `{approved, file_path}` | 🟢 Nhỏ |

> [!TIP]
> **Token optimization by design**: 
> - MCP tools trả về `file_path` chứ KHÔNG trả full data
> - Agent dùng `view_file()` (Antigravity native) để đọc → native optimization
> - Total coordination overhead ≈ 200-300 tokens per task (rất rẻ)

---

## 4. Cross-Platform Paths (Linux + Windows)

> [!IMPORTANT]
> User dùng CẢ Linux VÀ Windows → PHẢI dùng relative paths + `path.join()`

### 4.1 Quy tắc

```javascript
// ❌ SAI — absolute path, chỉ chạy trên Linux
const taskFile = '/home/user/agent-orchestrator/exchange/inbox/01.json';

// ❌ SAI — hardcode separator
const taskFile = 'exchange\\inbox\\01.json';

// ✅ ĐÚNG — relative path + path.join
import { join, resolve } from 'path';

const PROJECT_ROOT = resolve(process.cwd()); // hoặc config
const taskFile = join(PROJECT_ROOT, 'exchange', 'inbox', '01.json');
```

### 4.2 Config pattern

```javascript
// src/config.mjs
import { resolve, join } from 'path';

export function loadConfig(overrides = {}) {
  const root = overrides.root || resolve(process.cwd());
  
  return {
    root,
    exchange: {
      base: join(root, 'exchange'),
      inbox: join(root, 'exchange', 'inbox'),
      active: join(root, 'exchange', 'active'),
      outbox: join(root, 'exchange', 'outbox'),
      checkpoints: join(root, 'exchange', 'checkpoints'),
    },
    templates: join(root, 'templates'),
    plans: join(root, 'plan'),
    server: {
      port: overrides.port || 3847,
      host: '127.0.0.1', // localhost only
    }
  };
}
```

### 4.3 MCP trả về relative paths

```javascript
// MCP tool response cho agent
MCP.get_next_task("worker-1")
→ {
    task_id: "01",
    file_path: "exchange/active/01-fix-menu.task.json"  // ← RELATIVE!
  }

// Agent đọc bằng view_file → Antigravity tự resolve relative path
```

### 4.4 Windows symlink (junction)

```javascript
// Khi tạo exchange/ dirs — dùng junction trên Windows
import { platform } from 'os';

if (platform() === 'win32') {
  // Junction thay vì symlink (không cần admin quyền)
  execSync(`mklink /J "${target}" "${source}"`);
} else {
  symlinkSync(source, target);
}
```

---

## 5. Updated POC Roadmap (5 Phases)

### Phase A: MCP Server stdio — Hello World
**Mục tiêu**: Chứng minh MCP server hoạt động với Antigravity

- [ ] Init Node.js project (ESM, package.json)
- [ ] Install `@modelcontextprotocol/sdk` + `zod`
- [ ] Tạo minimal MCP server (stdio) với 2 tools:
  - `hello_world(name)` → greeting
  - `get_status()` → server info
- [ ] Config stdio trong `mcp_config.json`
- [ ] Mở Antigravity session → gọi tools → verify
- [ ] Ghi observations

---

### Phase B: Chuẩn bị Tools / Skills / Workflows
**Mục tiêu**: Chuẩn hóa tất cả assets TRƯỚC KHI build server phức tạp

- [ ] Tạo `.agent/skills/orchestrator-protocol/SKILL.md` (full protocol)
- [ ] Tạo `.agent/workflows/start-server.md`
- [ ] Tạo `.agent/workflows/orchestrate.md`
- [ ] Tạo `.agent/workflows/worker.md`
- [ ] Tạo `.agent/workflows/decompose-plan.md`
- [ ] Tạo `.agent/workflows/status.md`
- [ ] Copy/symlink generic skills: `strict-scope`, `token-optimization`, `git-commit-convention`
- [ ] Tạo `templates/task.template.json` (evolve từ template.md hiện có)
- [ ] Tạo `src/config.mjs` (cross-platform paths)
- [ ] Review & verify tất cả assets nhất quán

---

### Phase C: SSE Server + mcp-remote
**Mục tiêu**: Multi-session shared state hoạt động

- [ ] Upgrade MCP server từ stdio → SSE (Streamable HTTP)
- [ ] Test thủ công: `npx mcp-remote http://localhost:3847/sse`
- [ ] Config `mcp_config.json` dùng mcp-remote
- [ ] Mở 1 session → verify connection
- [ ] Mở 2 sessions → verify SHARED state
- [ ] Test long-running connection (30+ phút)
- [ ] Test reconnect sau disconnect
- [ ] Tạo auto-start script (health check → start if needed)

---

### Phase D: File IPC Integration (Relative Paths)
**Mục tiêu**: Dual-Layer hoạt động, cross-platform

- [ ] Tạo `exchange/{inbox,active,outbox,checkpoints}/`
- [ ] Implement `file-backend.mjs` (read/write/move with relative paths)
- [ ] Implement dual-write trong `state-manager.mjs`
- [ ] Tool `get_next_task()` → move file + return relative path
- [ ] Tool `complete_task()` → write result + move file
- [ ] Test trên Linux
- [ ] Test trên Windows (nếu có)
- [ ] Test crash recovery: kill server → restart → state restored

---

### Phase E: Full Flow Test — 1 Real Task
**Mục tiêu**: End-to-end proof-of-concept với task thật

- [ ] Viết 1 plan MD đơn giản (ví dụ: "Thêm README section")
- [ ] Mở session → agent gọi decompose → tạo 1-2 tasks
- [ ] Agent tự pull task → execute → complete
- [ ] Verify: task file moved inbox → active → outbox
- [ ] Verify: result JSON correct
- [ ] Verify: checkpoint saved
- [ ] Measure: bao nhiêu tokens tiêu tốn cho coordination?
- [ ] Document observations & gaps

---

## 6. Architecture Score Update

### Từ 7/10 → 8.5/10

| Improvement | Before | After |
|-------------|--------|-------|
| Tools/Skills/Workflows standardized | 🟡 Ad-hoc | ✅ Classified + mapped |
| Cross-platform paths | ❌ Hardcoded | ✅ Relative + `path.join()` |
| Auto-start script | ❌ Manual only | ✅ Health check + auto |
| Startup order documented | ❌ | ✅ Workflow `/start-server` |
| Plan → Task boundary | 🟡 Unclear | ✅ MCP tools define boundary |
| Existing skills leverage | ❌ Ignored | ✅ Mapped to orchestrator |
| POC roadmap | 🟡 3 phases | ✅ 5 phases, ordered correctly |

### Còn lại để đạt 9+/10 (sau POC):

| Item | Khi nào |
|------|---------|
| Real multi-session stress test | Phase C |
| Token counting real-time | V0.2 |
| Auto-scaling sessions | V0.2 |
| Full integration tests | Phase E |
