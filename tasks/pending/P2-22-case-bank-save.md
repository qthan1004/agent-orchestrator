# Task P2-22: Case Bank Save

## Info
- **ID:** P2-22-case-bank-save
- **Module:** `src/worker/case-bank.ts` (NEW)
- **Group:** Post-Core Intelligence
- **Dependencies:** P2-13, P2-01, P2-23, P2-26
- **Priority:** 17
- **Ref:** Phase 2 memory boundary rules

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

After AgentRunner completes a task (success or fail), save a reflection markdown file into the **workspace-scoped case bank by default**.

### Default location

`<workspace-runtime>/memory/case-bank/{date}_{task-id}.md`

### Scope rules

- Default write target is **workspace-local**
- Cross-workspace/global memory is **not** the default
- Any future promotion to global knowledge must be explicit and outside this task
- Reflection metadata must include `workspace_id` or normalized workspace path

### Reflection format (markdown)

```markdown
# Reflection: {task-id}
<!-- Date: {ISO date} -->
<!-- Outcome: SUCCESS | FAILED | PARTIAL -->
<!-- Domain: {detected or 'unknown'} -->
<!-- Task Type: {action type} -->
<!-- Workspace: {workspace_id} -->

## What Worked
- {auto-generated from successful steps}

## What Failed
- {auto-generated from error_context if present}

## Lesson
- {LLM-generated self-reflection, 2-3 bullet points}
```

### Flow

1. AgentRunner completes task
2. Reflection save is routed under that worker's registered workspace scope
3. If short reflection generation succeeds, include `Lesson`
4. If reflection generation fails, save a basic reflection anyway

### Constraints

- Reflection generation call must be < 500 tokens
- Failure to generate reflection must not crash execution
- No implicit writes to global case-bank

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/case-bank.ts` |

## Done Criteria
- [ ] Saves reflection `.md` to workspace-scoped case bank
- [ ] Reflection contains workspace identity metadata
- [ ] No default global write path
- [ ] Graceful fallback if reflection generation fails
- [ ] `npm run build` pass
