# Archive: Phase 2 Pull-Model APIs

> Archived: 2026-05-10
> Reason: Architecture shift to Head→Body→Worker unidirectional flow

## What was archived

The pull-model APIs allowed workers to **self-select tasks** from the queue.
This violated the assignment-first contract where only the Orchestrator (Body) 
decides which worker gets which task.

### Archived components

| Component | Description |
|-----------|-------------|
| `idle-resolver.ts` | Worker self-promotion to PLANNER role |
| `tools-pull-model.ts` | `get_next_task`, `check_plans`, `auto_pickup`, `tryAutoPickup()` |
| `poll-helpers-pull.ts` | `waitForTask()`, `waitForPlan()` long-polling |

### Why archived (not deleted)

- Proves automation concept is feasible
- Reference for future assignment-first implementation
- IDE mode was working but not efficient for the target architecture

### Current mindset

```
Head (Planner) → receives plan → analyzes → breaks into tasks
Body (Orchestrator) → distributes tasks → spawns workers
Worker → receives task → executes → reports result
```

**Flow is strictly unidirectional.** Workers do not self-select tasks.
