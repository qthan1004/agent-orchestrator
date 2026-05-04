---
description: Pick the smallest (FIFO) task from tasks/pending, move to processing, execute, then move to done.
---

# Pick Task (FIFO)

Pick one task from `tasks/pending/`, execute it, and complete it.

> **Cross-platform**: Uses Node.js scripts in `.agent/tools/`, works on both Linux and Windows.

## Steps

### 1. Pick task FIFO from pending → processing
// turbo
```bash
node .agent/tools/pick-task.mjs
```
→ Scans `tasks/pending/`, picks the file with lowest number, moves to `tasks/processing/`.
→ Output JSON: `{ picked: "<filename>", path: "tasks/processing/<filename>" }`
→ If `picked: null` → stop, report "No pending tasks."
→ If `error` (task already in processing) → read that task, continue from step 2.

### 2. Read task content

Use `view_file` to read the file at `path` returned from step 1.

Key sections:
- **What to do** — Implementation instructions
- **Files** — Files to create/modify
- **Verification** — Commands to run after completion
- **Done Criteria** — Completion checklist

### 3. Enforce Skills (MANDATORY — before ANY code change)

Before writing any code, activate ALL always-on skills. These are **non-negotiable constraints**:

| Skill | Rule | Violation = |
|-------|------|-------------|
| **strict-scope** | Do ONLY what the task says. Before every action ask: "Did the task request this?" If NO → don't do it. | Adding unrequested refactoring, tests, cleanup, or "improvements" |
| **safe-deletion** | NEVER delete files/dirs without explicit user permission. `SafeToAutoRun: false` for destructive commands. | Using `rm`, `rm -rf`, overwriting files not listed in task |
| **folder-convention** | Product folders (`plan/`, `exchange/`, `prompts/`) ≠ Dev folders (`dev-docs/`, `tasks/`, `.agent/`). Never mix. | Putting dev plans in `plan/pending/`, putting tasks in `exchange/` |

**Self-check before each file change:**
1. ✅ Is this file listed in the task's **Files** section?
2. ✅ Am I creating/modifying only what the task specifies?
3. ✅ Am I NOT deleting anything without permission?
4. ✅ Am I writing to the correct folder type (product vs dev)?

If ANY answer is NO → **STOP and ask the user.**

### 4. Execute task

Follow the **What to do** section exactly:
- Create/modify ONLY files listed in **Files**
- Stay in scope — do NOT add anything beyond requirements
- If task requires deleting files → ask user first (safe-deletion)
- If unsure about scope → ask user (strict-scope)

### 5. Verify results

Run verification commands from the task file.
- **PASS** → proceed to step 6
- **FAIL** → go back to step 4, debug and fix

### 6. Mark Done Criteria

Review the **Done Criteria** checklist. Tick `[x]` for each completed item.

### 7. Complete task — move to done
// turbo
```bash
node .agent/tools/complete-task.mjs
```
→ Moves file from `tasks/processing/` to `tasks/done/`.

### 8. Report

Print a brief summary:
```
✅ Task <filename> completed.
- Files changed: <list>
- Verification: PASSED
- Skills enforced: strict-scope ✅ | safe-deletion ✅ | folder-convention ✅
```

> **Note**: To pick the next task, run `/pick-task` again.
