# Task P2-40: E2E Integration Test

## Info
- **ID:** P2-40-e2e-integration
- **Module:** `tests/`
- **Group:** Core Verification
- **Dependencies:** P2-16, P2-25, P2-20, P2-28, P2-22, P2-32, P2-39
- **Priority:** 8
- **Ref:** Phase 2 assignment architecture

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Write full E2E tests for the canonical Phase 2 architecture:

`Planner -> Orchestrator -> Worker`

### Canonical behavior to test

- There is exactly **one Planner** in the orchestration session.
- Workers must register with an explicit `workspace_path`.
- Orchestrator assigns tasks downward to workers.
- Workers do **not** pull or pick arbitrary tasks.
- Task state transitions are owned by the Orchestrator.
- IPC, logs, checkpoints, and memory are scoped to the registered workspace.

### Test scenarios

**Session setup**
- Register worker with `workspace_path`
- Verify `workspace_id` is created from that exact path
- Verify workspace-scoped runtime paths are created and used

**Planner -> Orchestrator -> Worker flow**
- Start server in HYBRID mode
- Create plan in a specific workspace
- Planner decomposes once
- Orchestrator assigns a concrete task to a specific worker
- Worker executes assigned task only
- Worker reports progress and completion
- Result appears in that workspace's scoped output/state

**Assignment ownership**
- Worker cannot fetch a random next task
- Worker cannot complete a task not assigned to it
- Orchestrator rejects task execution outside assigned workspace context

**Recovery / failure**
- Assigned worker crash -> assigned task requeued by orchestrator
- Assigned worker timeout -> worker killed + task requeued
- Clean restart preserves workspace-scoped state correctly
- Ollama down -> error logged, server does not crash

### Legacy compatibility

- `get_next_task` is **not** part of the canonical E2E flow
- If legacy pull APIs still exist temporarily, test them separately as compatibility only

## Files
| Action | Path |
|--------|------|
| NEW | `tests/e2e-hybrid-assignment.ts` |
| MODIFY | existing test files as needed |

## Done Criteria
- [ ] E2E validates `Planner -> Orchestrator -> Worker`
- [ ] Worker registration requires explicit `workspace_path`
- [ ] Task assignment is orchestrator-owned, not worker-pulled
- [ ] Workspace-scoped IPC/state is verified in runtime
- [ ] Worker crash -> task requeued
- [ ] Worker timeout -> worker killed
- [ ] Legacy pull flow removed from canonical E2E
- [ ] `npm test` -> all pass
