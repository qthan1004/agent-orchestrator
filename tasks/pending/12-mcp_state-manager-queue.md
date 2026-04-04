# State Manager + Task Queue

- **Phase**: C — File IPC + Core MCP Tools
- **Goal**: Implement dual-write state manager và task queue với DAG group ordering

## Files

| Action | Path |
|--------|------|
| NEW | `src/mcp-server/state-manager.mjs` |
| NEW | `src/mcp-server/task-queue.mjs` |

## What to Do

### 1. `src/mcp-server/state-manager.mjs`

Dual-write pattern: mọi state update → memory + file

```javascript
class StateManager {
  constructor(config, fileBackend, logger)

  // Plan management
  loadPlan(planFilePath)           // Store plan in state + copy to exchange/inbox/_plan.md
  getPlan()                        // Return plan info

  // Task management (delegates to TaskQueue for ordering)
  storeTasks(tasks[], graph)       // Write task JSONs vào inbox/ + _queue.json
  moveToActive(taskId)             // inbox/ → active/
  moveToOutbox(taskId, result)     // active/ → outbox/ + write result.json
  moveToInbox(taskId)              // active/ → inbox/ (requeue)

  // Checkpoint
  saveCheckpoint()                 // Snapshot current state → checkpoints/
  loadCheckpoint()                 // Load latest checkpoint (for crash recovery)

  // State query
  getStatus()                      // { total, pending, active, done, blocked, failed }
}
```

### 2. `src/mcp-server/task-queue.mjs`

Queue với group-based ordering (DAG):

```javascript
class TaskQueue {
  constructor()

  // Setup
  loadFromGraph(tasks[], graph)    // Build internal queue from decomposition
  loadFromFiles(inboxDir, activeDir, outboxDir)  // Restore from files (crash recovery)

  // Operations
  getNextTask(preferredModel?)     // Return next available task (respect DAG groups)
  completeTask(taskId, status)     // Mark done, check if next group unlocks
  getStatus()                      // Summary stats

  // DAG
  isGroupComplete(groupId)         // All tasks in group done?
  getUnlockedTasks()               // Tasks whose dependencies are all met
  validateDAG(graph)               // No circular deps
}
```

**Group ordering logic**:
- Groups execute in `group_id` order
- Tasks WITHIN a group can run in parallel
- Group N+1 only starts when ALL tasks in group N are `done`
- `getNextTask()` chỉ return tasks từ unlocked groups

## Constraints

- StateManager LUÔN dual-write: memory update + file write
- TaskQueue là pure logic — không touch files (StateManager handles file ops)
- DAG validation: reject circular dependencies
- Race condition safe: Node.js single-thread serialize requests

## Dependencies

- `11-utils_file-backend-logger` phải xong trước

## Verification

```bash
node -e "
  import { TaskQueue } from './src/mcp-server/task-queue.mjs';
  const q = new TaskQueue();
  q.loadFromGraph(
    [{id:'01',title:'A'},{id:'02',title:'B'},{id:'03',title:'C'}],
    {groups:[{group_id:1,tasks:['01','02']},{group_id:2,tasks:['03'],depends_on:[1]}]}
  );
  console.log(q.getNextTask()); // should return 01 or 02
  console.log(q.getStatus());
"
```

## Done Criteria

- [ ] `StateManager` dual-writes all operations
- [ ] `TaskQueue` respects group ordering (DAG)
- [ ] `getNextTask()` only returns tasks from unlocked groups
- [ ] `completeTask()` unlocks dependent groups when all prereqs done
- [ ] `validateDAG()` rejects circular dependencies
- [ ] Crash recovery: `loadFromFiles()` restores queue state
