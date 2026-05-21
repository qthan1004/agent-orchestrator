# Task P2-36: Harness Module Boundary

## Info
- **ID:** P2-36-harness-module-boundary
- **Module:** `src/harness/` (NEW), worker runner boundary
- **Group:** Architecture Alignment
- **Dependencies:** P2-33, P2-35
- **Priority:** 4
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in `src/`. Dev docs in `dev-docs/`. Tasks in `tasks/`.

## What to do

Separate Harness from Server and Worker concepts.

Harness is an independent runtime module:

- parse server envelope
- load assigned task file from workspace-local `.orchestrator`
- load selected static skill/context files
- expose tool bundle to model
- enforce path sandbox
- run model loop
- send callback event to server

Server must only spawn Harness. Server must not run model logic or read task body.

Suggested structure:

```text
src/harness/
  index.ts
  runner.ts
  payload.ts
  tool-registry.ts
  workspace-loader.ts
  callback-client.ts
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/harness/` |
| MODIFY | dispatch/spawn path to target Harness entrypoint |
| MODIFY | existing worker runner only as needed to preserve compatibility |

## Done Criteria
- [x] Harness has explicit payload contract
- [x] Server spawns Harness only
- [x] Harness loads task body, not Server
- [x] Harness owns tool bundle exposure
- [x] Harness owns callback client
- [x] Model loop is not in server modules
- [x] `npm run build` passes
