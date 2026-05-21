# Task P2-39: Contract E2E Gates

## Info
- **ID:** P2-39-contract-e2e-gates
- **Module:** verification, task done criteria
- **Group:** Architecture Alignment
- **Dependencies:** P2-34, P2-35, P2-36, P2-37
- **Priority:** 7
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Test/dev artifacts go in `tests/` or `dev-docs/`, not product workspace folders.

## What to do

Replace module-based done evidence with contract/E2E done gates for runtime-affecting tasks.

Done gate levels:

```text
build pass
contract/invariant check pass
real E2E proof pass
```

Minimum real E2E proofs:

- code workspace: Ollama worker edits one tiny file and reports changelog
- data workspace: worker processes dummy CSV/XLSX-like files and writes report
- low-confidence workspace: routing hint refuses to guess and requests Planner/Human decision
- recovery: active task can be rebuilt from workspace-local registry/exchange after interruption

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | verification docs/scripts |
| MODIFY | `tasks/README.md` or done-gate docs |

## Done Criteria
- [ ] Runtime tasks require E2E proof in done criteria
- [ ] Code workspace smoke path documented
- [ ] Data workspace smoke path documented
- [ ] Low-confidence routing handoff smoke path documented
- [ ] Recovery smoke path documented
- [ ] `npm run build` passes
