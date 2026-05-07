# Task P2-22: Case Bank Save

## Info
- **ID:** P2-22-case-bank-save
- **Module:** `src/worker/case-bank.ts` (NEW)
- **Group:** Sprint 4 (Polish + Intelligence)
- **Dependencies:** P2-13, P2-01
- **Priority:** 12
- **Ref:** `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`, `dev-docs/2026-05-07_research_planner-intelligence-domain-adaptation-cold-start.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

After AgentRunner completes a task (success or fail), save a reflection markdown file to the global case-bank.

### Location:
`~/.orchestrator/case-bank/{date}_{task-id}.md`

### Reflection format (markdown):
```markdown
# Reflection: {task-id}
<!-- Date: {ISO date} -->
<!-- Outcome: SUCCESS | FAILED | PARTIAL -->
<!-- Domain: {detected or 'unknown'} -->
<!-- Task Type: {action type} -->
<!-- Workspace: {workspace name} -->

## What Worked
- {auto-generated from successful steps}

## What Failed
- {auto-generated from error_context if present}

## Lesson
- {LLM-generated self-reflection, 2-3 bullet points}
```

### Flow:
1. AgentRunner finishes task → calls `CaseBank.saveReflection(taskResult)`
2. CaseBank generates reflection prompt → sends to LLM (1 short call)
3. Saves markdown file to `~/.orchestrator/case-bank/`
4. Updates `_index.md` with new entry

### Constraints:
- Reflection LLM call must be < 500 tokens (very short)
- If LLM call fails → save basic reflection (no "Lesson" section) → no crash
- Global scope: reflections shared across all workspaces

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/case-bank.ts` |

## Done Criteria
- [ ] Saves reflection .md to `~/.orchestrator/case-bank/`
- [ ] Reflection contains: outcome, domain, what_worked, what_failed, lesson
- [ ] Updates `_index.md`
- [ ] Graceful fallback if LLM reflection call fails
- [ ] `npm run build` pass
