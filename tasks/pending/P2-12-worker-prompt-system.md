# Task P2-12: Worker Prompt System (SKILL.md Pattern)

## Info
- **ID:** P2-12-worker-prompt-system
- **Module:** `src/worker/prompt-builder.ts` (NEW), `prompts/workers/` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** P2-11
- **Priority:** 10
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Addendum Update 2

## What to do

Tạo `PromptBuilder` class + prompt templates cho workers.

### PromptBuilder:
- `buildPrompt(task)` → loads `base-worker.md` + `skill-{action}.md`
- Template vars: `{{task_id}}`, `{{action}}`, `{{module}}`, `{{workspace_root}}`
- Missing skill → fallback to base only (no crash)

### Prompt files:
- `prompts/workers/base-worker.md` — core rules (one-shot, no loop, sandbox, changelog)
- `prompts/workers/skill-implement.md` — implementation tasks
- `prompts/workers/skill-test.md` — test writing tasks
- `prompts/workers/skill-refactor.md` — refactoring tasks

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/prompt-builder.ts` |
| NEW | `prompts/workers/base-worker.md` |
| NEW | `prompts/workers/skill-implement.md` |
| NEW | `prompts/workers/skill-test.md` |
| NEW | `prompts/workers/skill-refactor.md` |

## Done Criteria
- [ ] `buildPrompt(task)` returns system prompt string
- [ ] Base rules always included
- [ ] Action-specific skill loaded dynamically
- [ ] Missing skill → fallback, no crash
- [ ] Template vars replaced correctly
