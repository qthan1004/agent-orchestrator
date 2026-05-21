# Task P2-35: Registry Identity Invariants

## Info
- **ID:** P2-35-registry-identity-invariants
- **Module:** workspace-local registry
- **Group:** Architecture Alignment
- **Dependencies:** P2-34
- **Priority:** 3
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in `src/`. Dev docs in `dev-docs/`. Tasks in `tasks/`.

## What to do

Make the three identity registry the central contract:

- `workspace_id`
- `worker_id`
- `task_id`

Implement invariant checks around registry/state transitions.

Required invariants:

```text
workspace_id exists before any task_id or worker_id
task.workspace_id must equal an active registered workspace
worker.workspace_id must equal an active registered workspace
worker.current_task_id may be null
worker.current_task_id != null => task.assigned_worker_id == worker.id
task.assigned_worker_id != null => worker.current_task_id == task.id
worker owns max 1 active task
task assigned to max 1 worker
closed workspace accepts no new task or worker
server stores task path/status/lock only, not task body
```

## Files
| Action | Path |
|--------|------|
| MODIFY | registry/state manager modules |
| NEW/MODIFY | invariant validation helpers |
| NEW/MODIFY | focused tests or verification script if current test infra is absent |

## Done Criteria
- [ ] Registry records workspace/task/worker identity separately
- [ ] Invalid workspace/task/worker relation is rejected
- [ ] Worker cannot own more than one active task
- [ ] Task cannot be assigned to more than one worker
- [ ] Closed workspace rejects new task/worker registration
- [ ] Task body is not stored in server registry
- [ ] `npm run build` passes
