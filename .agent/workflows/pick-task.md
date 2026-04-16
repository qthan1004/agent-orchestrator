---
description: Pick the smallest (FIFO) task from tasks/pending, move to processing, execute, then move to done.
---

# Pick Task (FIFO)

Pick one task from `tasks/pending/`, execute it, and complete it.

> **Cross-platform**: Uses Node.js scripts in `tools/`, works on both Linux and Windows.

## Steps

### 1. Pick task FIFO from pending → processing
// turbo
```bash
node tools/pick-task.mjs
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

### 3. Execute task

Follow the **What to do** section exactly:
- Create/modify files listed in **Files**
- Stay in scope — do NOT add anything beyond requirements (ref: skill `strict-scope`)

### 4. Verify results

Run verification commands from the task file.
- **PASS** → proceed to step 5
- **FAIL** → go back to step 3, debug and fix

### 5. Mark Done Criteria

Review the **Done Criteria** checklist. Tick `[x]` for each completed item.

### 6. Complete task — move to done
// turbo
```bash
node tools/complete-task.mjs
```
→ Moves file from `tasks/processing/` to `tasks/done/`.

### 7. Report

Print a brief summary:
```
✅ Task <filename> completed.
- Files changed: <list>
- Verification: PASSED
```

> **Note**: To pick the next task, run `/pick-task` again.
