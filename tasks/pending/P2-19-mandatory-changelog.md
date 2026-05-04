# Task P2-19: Mandatory Changelog Generation

## Info
- **ID:** P2-19-mandatory-changelog
- **Module:** `src/worker/agent-runner.ts`, `prompts/workers/base-worker.md`
- **Group:** Sprint 4 (Polish + E2E)
- **Dependencies:** P2-12, P2-13
- **Priority:** 13
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.5

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Worker must generate structured changelog on task completion.

### Prompt injection:
- `base-worker.md` includes changelog template requirement
- Worker MUST produce: files touched, lines added/removed, logic description

### AgentRunner:
- Parse changelog from LLM final response
- Include in `complete_task` summary
- Result JSON has `changelog` field

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/agent-runner.ts` |
| MODIFY | `prompts/workers/base-worker.md` |

## Done Criteria
- [ ] Prompt includes changelog template
- [ ] Result JSON has `changelog` field
- [ ] Changelog lists files + changes description
