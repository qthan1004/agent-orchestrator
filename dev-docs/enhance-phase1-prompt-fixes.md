# Enhance Phase 1 — Agent Prompt Fixes & Token Optimization

> Created: 2026-04-07  
> Status: Pending Implementation

## Background

Server orchestrator chạy **ngoài** project folder (ví dụ: server ở `agent-orchestrator/`, nhưng agent cần implement code ở `~/Personal-libs/`). Prompt hiện tại không phân biệt 2 path này → agent không biết đọc plan/task ở đâu, execute code ở đâu.

Ngoài ra có 2 bugs trong prompt + 1 phân tích token optimization + 1 cơ chế auto-kill worker disconnect.

---

## Issue 1: Thêm Path Context vào `register_worker` response + prompt

**Vấn đề**: Agent không biết:
- **Server root** (`server_root`): nơi chứa `plan/`, `tasks/`, `exchange/`, `templates/`
- **Workspace root** (`workspace_root`): nơi agent thực sự implement code (project đích)

**Giải pháp**:

### [MODIFY] `src/mcp-server/tools.mjs`

Thêm `server_root` và `workspace_root` vào `register_worker` response:

```diff
 return {
   content: [{
     type: "text",
     text: JSON.stringify({
       worker_id: worker.id,
       role: role,
       queue_summary: status,
-      has_pending_plans: planStatus.hasPending || planStatus.hasProcessing
+      has_pending_plans: planStatus.hasPending || planStatus.hasProcessing,
+      server_root: context.config.root,
+      workspace_root: context.config.workspaceRoot || null
     })
   }]
 };
```

### [MODIFY] `src/config.mjs`

Thêm `workspaceRoot` vào config:

```diff
 export function loadConfig(overrides = {}) {
   const root = overrides.root || resolve(__dirname, '..');
   return {
     root,
+    workspaceRoot: overrides.workspaceRoot || null,
     exchange: { ... },
```

### [MODIFY] `src/utils/startup-prompt.mjs`

Thêm câu hỏi `workspace_root` vào startup flow:

```diff
+  const workspaceRoot = (await rl.question('  ? Workspace root (project path for agents) [current dir]: ')).trim() || process.cwd();
   ...
   return {
     port: config.port,
     host: '127.0.0.1',
+    workspaceRoot: config.workspaceRoot,
     ...
   };
```

### [MODIFY] `prompts/agent-prompt.md`

Thêm Section mới giải thích 2 paths:

```markdown
## 1.1 Path Context

After `register_worker`, you receive two critical paths:

- **`server_root`**: The orchestrator's root directory (always the folder containing the orchestrator). All `plan/`, `tasks/`, `exchange/` paths are relative to this.
- **`workspace_root`**: The project you are working on. All code edits, file reads, and implementation happen here.

> **Key**: Plans and tasks are stored at `server_root`. Code execution happens at `workspace_root`. These are DIFFERENT locations.

## 1.2 Workspace Assets (REQUIRED)

When executing tasks, you **MUST** use the skills, context, tools, and workflows from the **workspace** (not the server):

- Read `.agent/skills/` or `reference/skills/` at `workspace_root` for project-specific skills
- Read `.agent/workflows/` at `workspace_root` for project-specific workflows  
- Read `reference/context/` at `workspace_root` for project context
- Use `reference/tools/` at `workspace_root` for project-specific scripts

These assets contain critical project conventions, coding standards, and automation that you MUST follow during implementation.
```

---

## Issue 2: Planner không chuyển plan về done

**Vấn đề**: Prompt chỉ nói "Submit → Call `submit_decomposition()`" nhưng KHÔNG nói rõ agent cần truyền `source_plan` (filename). Agent có thể bỏ qua hoặc truyền sai → plan không move từ `processing/` → `done/`.

**Phân tích code**: Server-side (`tools.mjs` line 390) **đã** gọi `stateManager.completePlan(source_plan)` tự động khi `submit_decomposition` thành công. Vậy bug là ở **prompt không enforce** agent phải truyền đúng `source_plan`.

**Giải pháp**:

### [MODIFY] `prompts/agent-prompt.md`

Làm rõ hơn step 4 của Section P:

```diff
-4. **Submit** — Call `submit_decomposition(tasks, graph, reasoning, source_plan, worker_id)`.
+4. **Submit** — Call `submit_decomposition(tasks, graph, reasoning, source_plan, worker_id)`.
+   - `source_plan` **MUST** be the exact filename from `check_plans` response (e.g. `"2026-04-07_my-plan.md"`).
+   - Server auto-moves plan from `processing/` → `done/` on success. Do NOT skip this parameter.
```

---

## Issue 3: Worker end chat thay vì idle loop

**Vấn đề**: Khi nhận `IDLE`, agent kết thúc conversation thay vì tiếp tục loop `get_next_task()`. Nguyên nhân: prompt không đủ mạnh trong Section I — agent hiểu "wait briefly" = "done, bye".

**Giải pháp**:

### [MODIFY] `prompts/agent-prompt.md`

Strengthen Section I:

```diff
 ## Section I — Idle Protocol
 
 When there is no work available:
 
-1. Wait briefly (Server handles long-polling, so a short pause is fine).
-2. Call `get_next_task(worker_id)` again.
-3. The server will hold the request for up to 30s before returning.
-4. React to whatever `action` the server returns.
+1. **DO NOT end the conversation.** You must stay alive and keep polling.
+2. Call `get_next_task(worker_id)` immediately — the server long-polls for up to 30s, so there is no need to delay on your side.
+3. React to whatever `action` the server returns.
+4. **Repeat** — go back to step 2 indefinitely.
 
-**max_idle_loops**: ∞ — Keep polling indefinitely unless the user instructs you to stop.
+⚠️ **CRITICAL**: NEVER end the chat session. Keep polling in an infinite loop.
+The ONLY reason to stop is if the user explicitly types "stop" or "exit".
```

> **Note**: Sẽ strengthen prompt tối đa rồi test bằng 1 task đơn giản. Nếu vẫn end chat → là platform limitation.

---

## Issue 4: Token Optimization Analysis

### 4.1 Inline task data vs file reference

Hiện tại `get_next_task` trả **full task JSON inline** trong MCP response:

```json
{
  "action": "EXECUTE",
  "task_id": "01-setup-env",
  "task_details": { "/* full task object ~30-50 lines */" }
}
```

**Option A — Inline (hiện tại)**: ~200-500 tokens/task
- ✅ Agent nhận được ngay, không cần tool call thêm
- ❌ Tốn token nếu task lớn

**Option B — File reference**: ~50 tokens response + 200-500 tokens cho `view_file`
- ✅ Response nhẹ hơn
- ❌ Agent phải gọi thêm 1 tool call → latency + vẫn tốn token khi đọc file
- ⚠️ **Net token = tương đương hoặc nhiều hơn** (thêm tool call overhead)

**Option C — Compact inline** (đề xuất): ~100-200 tokens
- Gửi task với chỉ các field cần thiết, không gửi metadata
- Dùng field names ngắn

> **Kết luận**: Inline compact là hiệu quả nhất. File reference **không tiết kiệm** token vì agent vẫn phải đọc file, thêm overhead tool call (~50 tokens mỗi call). Binary attachment không khả thi với MCP protocol text-only.

### 4.2 Format comparison: JSON vs YAML vs MD

| Metric | JSON | YAML | Markdown |
|--------|------|------|----------|
| Token/100 chars | ~25-30 | ~20-25 | ~20-25 |
| Structural overhead | High (`{}`, `""`, `,`) | Low (indentation) | Lowest (headings) |
| Agent parsing | Native ✅ | Good ✅ | Ambiguous ❌ |
| Tool compatibility | MCP native ✅ | Need convert | Need convert |
| Programmatic use | Direct ✅ | Need parser | Need parser |

> **YAML tiết kiệm ~15-20% token** so với JSON nhờ bỏ được `{}`, `""`, `,` syntax. Nhưng MCP protocol bắt buộc JSON response. → **Dùng JSON compact cho MCP responses, YAML cho file storage** (plan files, task definitions).

### 4.3 Recommended: Compact task response

```diff
 // Hiện tại — full object (~40 fields)
 task_details: { id, title, module, action, status, assigned_to, priority, 
                 what_to_do, files, constraints, dependencies, verification, 
                 done_criteria, metadata }

 // Đề xuất — compact (~8 fields)  
 task_details: { id, title, module, action, what_to_do, files, verification, constraints }
```

Bỏ: `status` (luôn ACTIVE), `assigned_to` (agent biết), `priority` (đã sorted), `metadata` (internal), `dependencies` (server đã resolve), `done_criteria` (nằm trong verification).

**Tiết kiệm ~40-50% token per task.**

---

## Issue 5: Worker Disconnect → Auto-kill & Task Requeue

**Vấn đề**: Khi có nhiều workers, 1 con bị disconnect tạm thời vài giây → task vẫn ở `active/` nhưng không ai làm. Worker khác không pick được task đó → workers dẫm lên nhau.

**Phân tích code hiện tại**:
- `recovery.mjs` có `checkStaleWorkers()` chạy mỗi 10s (`MONITOR_INTERVAL_MS`)
- Nhưng `STALE_THRESHOLD_MS` = **24 giờ** (86400000ms) → quá lâu, vô dụng cho disconnect detection
- `withHeartbeat()` middleware update heartbeat mỗi tool call, nhưng nếu worker disconnect thì không có tool call nào → heartbeat cũ
- `checkStaleWorkers()` **chỉ check workers có `current_task != null`** (line 151) → workers đang idle poll sẽ **không** bị false positive

**Giải pháp**: Giảm `STALE_THRESHOLD_MS` xuống **10 giây** + monitor 5s + cleanup worker khi stale:

**Timer conflict analysis** — Không có conflict:

| Timer | Interval | Data | Purpose |
|-------|----------|------|---------|
| Recovery monitor | 5s | `workers.last_heartbeat` | Detect stale workers |
| `waitForTask` | 2s | `queue.tasks` | Long-poll per-request |
| `waitForPlan` | 4s | `plan/pending/` | Long-poll per-request |

Cả 3 timers đọc **data khác nhau**, chạy **thread riêng**, không conflict. Recovery monitor dùng `.unref()` nên không block process exit.

**Combo**: `MONITOR_INTERVAL = 5s` + `STALE_THRESHOLD = 10s` → worst case detect trong **10-15s**.

### [MODIFY] `src/constants.mjs`

```diff
 export const RECOVERY_DEFAULTS = {
-  MONITOR_INTERVAL_MS: 10_000, // 10s
-  STALE_THRESHOLD_MS: 86400_000,  // 24 hours (chạy tới khi tắt thì thôi)
+  MONITOR_INTERVAL_MS: 5_000,     // 5s — frequent enough for fast detection
+  STALE_THRESHOLD_MS: 10_000,     // 10s — auto-kill disconnected workers
   MAX_RETRIES: 3
 };
```

### [MODIFY] `src/mcp-server/recovery.mjs`

Thêm `removeWorker()` call khi detect stale:

```diff
 _handleStaleTask(worker) {
   const taskId = worker.current_task;
   if (!taskId) return;
   // ... existing requeue logic ...
   worker.current_task = null;
+  // Kill the stale worker entirely
+  this.workerRegistry.removeWorker(worker.id);
 }
```

### [MODIFY] `src/utils/worker-registry.mjs`

Thêm `removeWorker()` method:

```diff
+  removeWorker(id) {
+    const removed = this.workers.delete(id);
+    if (removed) this._save();
+    return removed;
+  }
```

### [MODIFY] `src/utils/startup-prompt.mjs`

Thêm config cho disconnect threshold:

```diff
 const DEFAULTS = {
   port: 3847,
-  staleMinutes: 30,
+  staleSeconds: 10,
   pollTimeoutSec: 30,
   planWatcherSec: 30
 };
```

**Flow**: Worker disconnect > 10s → monitor detect stale → requeue task to `inbox/` → kill worker → task available for other workers.

> **Note**: False positive safe vì `checkStaleWorkers()` chỉ check workers có `current_task != null`. Worker idle poll an toàn.

---

## Verification Plan

### Manual Verification
1. Start server → check startup prompt hỏi workspace root + stale threshold
2. Agent register → check response có `server_root` + `workspace_root`
3. Agent decompose plan → check plan moves to `done/`
4. Agent idle → check agent keeps polling (not ending chat)
5. Disconnect 1 worker đang busy > 10s → check task requeue + worker killed
6. Worker 2 picks lại task đó → verify no conflict
