# Task P2-37: Domain Routing Hint Contract

## Info
- **ID:** P2-37-domain-routing-hint-contract
- **Module:** domain routing, tool bundle selection
- **Group:** Architecture Alignment
- **Dependencies:** P2-33, P2-36
- **Priority:** 5
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in `src/`. Dev docs in `dev-docs/`. Tasks in `tasks/`.

## What to do

Redefine domain detection as a shallow routing hint, not intelligence.

Allowed:

- file extensions
- manifest filenames
- folder names
- explicit workspace metadata inside `.orchestrator`

Forbidden:

- reading private data for meaning
- inferring task strategy
- creating task plans
- choosing domain with confidence when evidence is weak
- storing workspace content in server registry

Low confidence behavior:

```text
return generic-file bundle
set needs_planner_decision = true
do not guess
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `tasks/pending/P2-38-domain-routing-hint.md` if still pending |
| NEW/MODIFY | domain routing contract docs/code |

## Done Criteria
- [ ] Domain output is tags + confidence + evidence + recommended bundle
- [ ] Low confidence returns generic fallback and Planner/Human handoff flag
- [ ] No server-side content analysis
- [ ] Non-code workspaces are supported as first-class cases
- [ ] `npm run build` passes if code changes occur
