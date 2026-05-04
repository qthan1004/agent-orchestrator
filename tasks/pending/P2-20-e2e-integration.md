# Task P2-20: E2E Integration Test

## Info
- **ID:** P2-20-e2e-integration
- **Module:** `tests/`
- **Group:** Sprint 4 (Polish + E2E)
- **Dependencies:** P2-16
- **Priority:** 14
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Full E2E tests for both DEFAULT and HYBRID profiles.

### Test scenarios:

**DEFAULT mode** (legacy MCP flow):
- register_worker → get_next_task → complete_task
- Verify backward compatibility with all existing flows

**HYBRID mode** (dispatch loop):
- Start server HYBRID → create plan in workspace → PlanWatcher detects
- Planner decomposes → TaskDispatchLoop spawns worker → worker executes
- Result appears in workspace `.agent/results/`

**Error cases:**
- Worker crash → task requeued
- Worker timeout → killed + requeued
- Ollama down → error logged, no crash

## Files
| Action | Path |
|--------|------|
| NEW | `tests/e2e-hybrid.ts` |
| MODIFY | existing test files as needed |

## Done Criteria
- [ ] DEFAULT mode E2E passes (legacy flow)
- [ ] HYBRID mode E2E: plan → decompose → dispatch → worker → result
- [ ] Worker crash → task requeued
- [ ] Worker timeout → worker killed
- [ ] `npm test` → all pass
