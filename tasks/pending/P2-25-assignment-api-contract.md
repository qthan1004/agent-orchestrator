# Task P2-25: Assignment API Contract

## Info
- **ID:** P2-25-assignment-api-contract
- **Module:** `src/mcp-server/`, `src/models/`
- **Group:** Architecture Core
- **Dependencies:** None
- **Priority:** 10
- **Ref:** Phase 2 assignment-first architecture

## What to do

Define the canonical assignment-first contract for worker execution.

### Required operations

- `register_worker(workspace_path, capabilities, capacity)`
- `assign_task(worker_id, task_id, payload)`
- `ack_assignment(worker_id, task_id)`
- `report_progress(worker_id, task_id, step, percentage)`
- `complete_task(worker_id, task_id, status, summary)`

### Rules

- Worker cannot fetch arbitrary next task
- Orchestrator owns assignment and state transitions
- Worker can only act on assigned task
- Assignment payload must include workspace-scoped context

## Done Criteria
- [ ] Canonical API names and payloads defined
- [ ] Ownership rules defined
- [ ] State transitions documented
- [ ] Pull-model behavior excluded from canonical contract
