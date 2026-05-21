# Task P2-34: Workspace Bootstrap Template

## Info
- **ID:** P2-34-workspace-bootstrap-template
- **Module:** workspace bootstrap, templates
- **Group:** Architecture Alignment
- **Dependencies:** P2-33
- **Priority:** 2
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Product bootstrap templates may live in `templates/`. Dev docs stay in `dev-docs/`.

## What to do

Define and implement workspace-local orchestration bootstrap.

When `register_workspace(path)` is called:

- if `<workspace>/.orchestrator/` is missing, create the standard structure
- if it exists, do not overwrite user files
- server reads only registry/state files under `.orchestrator`
- root-level `plan/` and `exchange/` remain legacy/demo/dev, not canonical

Canonical workspace layout:

```text
<workspace>/.orchestrator/
  registry/
    workspace.json
    workers.json
    tasks.json
  exchange/
    inbox/
    active/
    outbox/
    checkpoints/
    logs/
    signals/
  plans/
    pending/
    processing/
    done/
  skills/
  context/
  results/
```

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | workspace bootstrap template files |
| MODIFY | bootstrap/register workspace code |

## Done Criteria
- [x] Registering a new empty workspace creates `.orchestrator/` structure
- [x] Existing `.orchestrator/` files are not overwritten
- [x] Server does not read user content outside `.orchestrator/`
- [x] Root-level `plan/` and `exchange/` documented as legacy/demo/dev only
- [x] `npm run build` passes
