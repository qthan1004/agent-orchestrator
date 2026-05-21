# Task P2-33: Pure Orchestrator Doctrine

## Info
- **ID:** P2-33-pure-orchestrator-doctrine
- **Module:** `dev-docs/`, architecture docs
- **Group:** Architecture Alignment
- **Dependencies:** None
- **Priority:** 1
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Dev docs in `dev-docs/`. Tasks in `tasks/`. Do not put dev artifacts in product folders.

## What to do

Write the canonical doctrine for Phase 2:

- Only Planner has brain
- Server is pure coordination: identity, state, lock, dispatch, recovery
- Harness is runtime wrapper: load assigned files, expose tools, run model, report
- Worker is disposable execution: one task lifetime, no memory
- Workspace files hold static knowledge for future task lifetimes

## Files
| Action | Path |
|--------|------|
| NEW or MODIFY | `dev-docs/architecture_pure-orchestrator-doctrine.md` |
| MODIFY | relevant architecture docs if needed |

## Done Criteria
- [ ] Doctrine states exactly one brain: Planner
- [ ] Server forbidden actions are explicit
- [ ] Harness forbidden actions are explicit
- [ ] Worker lifetime/memory boundary is explicit
- [ ] Workspace file knowledge is defined as static, curated, and non-autonomous
- [ ] No code changes
