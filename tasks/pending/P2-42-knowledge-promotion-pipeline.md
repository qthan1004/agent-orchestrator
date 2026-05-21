# Task P2-42: Knowledge Promotion Pipeline

## Info
- **ID:** P2-42-knowledge-promotion-pipeline
- **Module:** knowledge governance, proposal/approval flow
- **Group:** Architecture Alignment
- **Dependencies:** P2-33, P2-37
- **Priority:** 10
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Dev docs in `dev-docs/`. Tasks in `tasks/`. Product templates only if explicitly required.

## What to do

Define the approved knowledge promotion pipeline.

Knowledge evolution is allowed only through three gates:

```text
Worker report/proposal
  -> Planner evaluation
  -> User evaluation
  -> explicit approval
  -> promotion to workspace-local knowledge or approved default knowledge repo
```

### Required rules

- Worker can create a proposal/report only
- Planner evaluates usefulness, scope, privacy risk, and target knowledge location
- User explicitly approves before promotion
- Approved reusable defaults live in a Git-backed knowledge repo outside this project
- Workspace-local knowledge remains in that workspace unless approved for reusable promotion
- Private workspace data must not be promoted unless explicitly approved and sanitized
- Server does not read or store knowledge body

### Knowledge source priority

```text
1. workspace-local skills/context
2. approved default knowledge repo
3. generic minimal bundle
4. Planner/Human handoff
```

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | knowledge governance docs |
| MODIFY | related task docs if needed |

## Done Criteria
- [ ] Three-gate pipeline documented
- [ ] Worker proposal format documented
- [ ] Planner evaluation criteria documented
- [ ] User approval requirement documented
- [ ] Approved default knowledge repo rules documented
- [ ] Privacy/sanitization rule documented
- [ ] Server no-knowledge-body rule documented
