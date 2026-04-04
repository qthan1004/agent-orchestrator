# Implement State Manager + Task Queue

Khởi tạo hai component `TaskQueue` và `StateManager` giúp Orchestrator quản lý tiến độ tác vụ dựa trên DAG groups, đảm bảo persistence qua dual-write (memory + file).

## Design Decisions (Đã Chốt)

### 1. Recovery Strategy → File-based (Option B)
- **Không dùng checkpoint mechanism** cho POC.
- Khi server restart, rebuild state bằng cách **quét folder** `inbox/`, `active/`, `outbox/`.
- `saveCheckpoint()` / `loadCheckpoint()` → **defer sang Task 14** (recovery-crash-test).
- Lý do: đơn giản, ít code, đủ cho POC.

### 2. Paths → Dùng `loadConfig()` có sẵn
- Import `loadConfig()` từ `src/config.mjs` — đã có paths `exchange.inbox`, `exchange.active`, `exchange.outbox`, `exchange.checkpoints`.
- **Không thêm config mới**, dùng infrastructure đã build.

### 3. File Backend → Import functions trực tiếp
- `file-backend.mjs` export functions riêng lẻ (`readJSON`, `writeJSON`, `moveFile`, ...) — không phải class.
- **Không inject** qua constructor. Import trực tiếp, consistent với pattern của `WorkerRegistry`.

### 4. Graph Responsibility → TaskQueue chỉ validate + unlock
- `TaskQueue` chịu trách nhiệm: validate DAG (reject circular deps) + quyết định task nào unlocked.
- Điều phối event/routing do tầng MCP tools phía trên xử lý.

---

## Proposed Changes

### [NEW] `src/mcp-server/task-queue.mjs`

Pure logic, không đụng file system. Export class `TaskQueue`.

```javascript
export class TaskQueue {
  constructor()

  // Setup
  loadFromGraph(tasks[], graph)
  // Build internal queue từ decomposition output
  // tasks: [{ id, title, module, action, ... }]
  // graph: { groups: [{ group_id, tasks: [id], depends_on?: [group_id] }] }

  loadFromState(tasksMap)
  // Restore queue từ in-memory state (sau khi StateManager quét files)
  // tasksMap: Map<id, { ...task, status: 'pending'|'active'|'done'|'failed' }>

  // Operations
  getNextTask()
  // Return next available task từ unlocked groups
  // Logic: tìm group có group_id nhỏ nhất mà depends_on đều done
  //        → return task đầu tiên có status 'pending'
  // Return: task object | null

  completeTask(taskId, status)
  // status: 'done' | 'failed' | 'blocked'
  // Update internal state, check nếu group hoàn thành → unlock groups tiếp

  requeueTask(taskId)
  // Reset task status về 'pending' (cho retry flow)

  getStatus()
  // Return: { total, pending, active, done, blocked, failed }

  getUnlockedTasks()
  // Return array of tasks có thể chạy ngay (group dependencies đã met)

  // DAG Validation
  validateDAG(graph)
  // DFS cycle detection trên depends_on
  // Throw error nếu có circular dependency

  // Serialization
  serialize()
  // Return plain object để StateManager có thể persist
}
```

**Key implementation details**:
- Internal storage: `this.tasks = new Map()` — id → task object with status
- Internal groups: `this.groups = []` — sorted by group_id
- `getNextTask()`: filter unlocked groups → filter pending tasks → return first
- `validateDAG()`: build adjacency list từ `depends_on` → DFS detect back edges

---

### [NEW] `src/mcp-server/state-manager.mjs`

Dual-write wrapper: mỗi state change → update memory (TaskQueue) + write file (FileBackend).

```javascript
import { loadConfig } from '../config.mjs';
import { readJSON, writeJSON, moveFile, listFiles, ensureDir } from '../utils/file-backend.mjs';
import { TaskQueue } from './task-queue.mjs';

export class StateManager {
  constructor(logger)
  // this.config = loadConfig()
  // this.queue = new TaskQueue()
  // this.logger = logger
  // this.plan = null
  // ensureDir cho inbox, active, outbox

  // Plan management
  loadPlan(planMeta)
  // Lưu metadata (path, loaded_at) vào this.plan
  // KHÔNG copy file — agent dùng view_file đọc trực tiếp
  // Logger: log PLAN_LOADED

  getPlan()
  // Return this.plan (metadata only)

  // Task management
  storeTasks(tasks[], graph)
  // 1. queue.validateDAG(graph)
  // 2. queue.loadFromGraph(tasks, graph)
  // 3. Write từng task JSON vào inbox/ (task-{id}.json)
  // 4. Write _queue.json (graph metadata) vào exchange/
  // Logger: log TASKS_STORED

  moveToActive(taskId)
  // 1. moveFile(inbox/task-{id}.json, active/task-{id}.json)
  // 2. queue internal status update
  // Logger: log TASK_ACTIVATED

  moveToOutbox(taskId, result)
  // 1. moveFile(active/task-{id}.json, outbox/task-{id}.json)
  // 2. Write result-{id}.json vào outbox/
  // 3. queue.completeTask(taskId, result.status)
  // Logger: log TASK_COMPLETED

  moveToInbox(taskId)
  // 1. moveFile(active/task-{id}.json, inbox/task-{id}.json)
  //    hoặc moveFile(outbox/task-{id}.json, inbox/task-{id}.json)
  // 2. queue.requeueTask(taskId)
  // Logger: log TASK_REQUEUED

  // Recovery (file-based)
  restoreFromFiles()
  // 1. Scan inbox/ → status 'pending'
  // 2. Scan active/ → status 'active'
  // 3. Scan outbox/ → status 'done'/'failed'
  // 4. Read _queue.json cho graph info
  // 5. queue.loadFromState(rebuiltMap)
  // Logger: log STATE_RESTORED

  // State query
  getStatus()
  // Delegate to queue.getStatus() + thêm worker count
}
```

---

### [MODIFY] `src/constants.mjs`

Thêm task-related constants:

```javascript
export const TASK_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

export const FILE_PREFIXES = {
  TASK: 'task-',
  RESULT: 'result-',
  QUEUE: '_queue.json'
};
```

---

## Verification Plan

### Automated Tests

**Test 1 — TaskQueue DAG logic:**
```bash
node -e "
  import { TaskQueue } from './src/mcp-server/task-queue.mjs';
  const q = new TaskQueue();
  q.loadFromGraph(
    [{id:'01',title:'A'},{id:'02',title:'B'},{id:'03',title:'C'}],
    {groups:[{group_id:1,tasks:['01','02']},{group_id:2,tasks:['03'],depends_on:[1]}]}
  );
  console.log('Next:', q.getNextTask());   // 01 or 02
  console.log('Status:', q.getStatus());   // pending:3, active:0
  q.completeTask('01','done');
  q.completeTask('02','done');
  console.log('After group 1 done:', q.getNextTask()); // 03
"
```

**Test 2 — Circular dependency rejection:**
```bash
node -e "
  import { TaskQueue } from './src/mcp-server/task-queue.mjs';
  const q = new TaskQueue();
  try {
    q.validateDAG({groups:[
      {group_id:1,tasks:['01'],depends_on:[2]},
      {group_id:2,tasks:['02'],depends_on:[1]}
    ]});
    console.log('FAIL — should have thrown');
  } catch(e) {
    console.log('PASS — caught:', e.message);
  }
"
```

**Test 3 — StateManager dual-write:**
```bash
node -e "
  import { StateManager } from './src/mcp-server/state-manager.mjs';
  import { Logger } from './src/utils/logger.mjs';
  import { loadConfig } from './src/config.mjs';
  const config = loadConfig();
  const logger = new Logger(config.exchange.logs);
  const sm = new StateManager(logger);
  sm.storeTasks(
    [{id:'01',title:'Test Task'}],
    {groups:[{group_id:1,tasks:['01']}]}
  );
  console.log('Status:', sm.getStatus());
  // Verify file exists: exchange/inbox/task-01.json
"
```

**Test 4 — File-based recovery:**
```bash
node -e "
  import { StateManager } from './src/mcp-server/state-manager.mjs';
  import { Logger } from './src/utils/logger.mjs';
  import { loadConfig } from './src/config.mjs';
  const config = loadConfig();
  const logger = new Logger(config.exchange.logs);
  const sm = new StateManager(logger);
  sm.restoreFromFiles();
  console.log('Restored status:', sm.getStatus());
"
```
