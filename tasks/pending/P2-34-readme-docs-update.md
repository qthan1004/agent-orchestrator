# Task P2-34: README + Docs Update

## Info
- **ID:** P2-34-readme-docs-update
- **Module:** `README.md`, `dev-docs/`
- **Group:** Core Verification
- **Dependencies:** P2-33, P2-27
- **Priority:** 19
- **Ref:** All Phase 2 docs

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Update README and technical docs so they lock in the canonical Phase 2 architecture instead of the legacy pull model.

### Architecture points that MUST be explicit

- Canonical flow is `Planner -> Orchestrator -> Worker`
- There is exactly **one Planner** per orchestration session
- Workers are a scalable execution pool
- Workers do **not** pick tasks
- Orchestrator owns assignment, retries, state transitions, and dispatch
- Worker registration must include explicit `workspace_path`
- IPC, state, checkpoints, and memory are workspace-scoped by default
- Any legacy pull APIs must be documented as compatibility-only or deprecated

### README changes

- Architecture diagram: Planner / Orchestrator / Worker
- 3-tier structure with workspace-scoped runtime state
- Startup flow with explicit workspace registration
- HYBRID mode as orchestrator-owned dispatch
- Remove canonical examples based on `get_next_task`

### Dev docs

- Update technical flow docs to remove ambiguous pull-model language
- Mark `get_next_task` as legacy/deprecated if still present
- Clarify local memory vs optional promoted/global knowledge

### Task board

- Update `tasks/README.md` counts + Phase 2 section
- Include newly added architecture-alignment tasks

## Files
| Action | Path |
|--------|------|
| MODIFY | `README.md` |
| MODIFY | relevant docs in `dev-docs/` |
| MODIFY | `tasks/README.md` |

## Done Criteria
- [ ] README states `Planner -> Orchestrator -> Worker`
- [ ] Single-planner rule is explicit
- [ ] Worker assignment model is explicit
- [ ] Workspace-scoped registration/state/memory is documented
- [ ] Legacy pull flow removed from canonical docs
- [ ] Task board reflects added architecture tasks
