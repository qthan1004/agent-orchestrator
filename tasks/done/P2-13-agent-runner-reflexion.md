# Task P2-13: AgentRunner Reflexion Loop

## Info
- **ID:** P2-13-agent-runner-reflexion
- **Module:** `src/worker/agent-runner.ts`
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** P2-11
- **Priority:** 10
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Addendum Update 1 (P0)

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Thêm bounded reflexion vào AgentRunner.

### Reflexion logic:
1. Tool execution fails → inject error into next LLM turn
2. LLM diagnoses → fixes → retries (max 2 reflexion loops)
3. Still fails → checkpoint with diagnosis `{ error, hypothesis, attempted_fix }` → exit(1)

### Safety guards:
- No-tool detection: 3 consecutive turns without tool_calls → exit(1)
- JSON malformed: 3 retries then exit(1)
- Exit checkpoint always contains `error_context` field

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/agent-runner.ts` |

## Done Criteria
- [x] Tool error → injected into next LLM turn → retry
- [x] Max 2 reflexion loops then checkpoint + exit
- [x] No-tool detection (3 turns) → exit(1)
- [x] JSON malformed → 3 retries then exit(1)
- [x] Exit checkpoint contains `error_context`
