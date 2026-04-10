# Task PQ03: Rewrite Planner Step 3 — 5 sub-steps

## Info
- **ID:** PQ03-prompt-planner-step3-rewrite
- **Module:** prompts
- **Group:** 2 (Prompt — Planner)
- **Dependencies:** none
- **Priority:** 3
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md` → "Change 1"

## What to do

### Goal
Rewrite Section P (Planner protocol) Step 3 trong `prompts/agent-prompt.md`. Thay thế step 3 hiện tại (line 119-126 hoặc tương đương) bằng 5 sub-steps chi tiết: 3A Workspace Discovery, 3B Reference Study, 3C Plan Validation, 3D Task Decomposition, 3E Quality Self-Check.

### Nội dung thay thế

**Replace** step 3 hiện tại `[Mode B] Receive plan content...` với nội dung sau:

```markdown
3. **[Mode B]** Receive plan content. Execute the following sub-steps IN ORDER:

   ### Step 3A — Workspace Discovery (MANDATORY — every plan)
   
   Read ALL of the following (skip only if file doesn't exist):
   
   1. `workspace_root/.agent/context.md` — project conventions, skill index
   2. Each skill in `workspace_root/.agent/skills/*/SKILL.md` — read ALL skills
   3. `workspace_root/.agent/workflows/` — list and read relevant workflows
   4. If `workspace_root/plan/tasks/done/` exists — read 1-2 recent tasks as **format template**
   
   **Cache discovered rules in your reasoning.** You will inject them into every task.
   
   ### Step 3B — Reference Implementation Study (MANDATORY — every plan)
   
   REGARDLESS of plan type (new component, fix, refactor):
   1. Find the most similar existing code in `workspace_root` 
      (e.g., `chip` for `switch`, `button` for `icon-button`, existing module for a fix)
   2. READ the actual source code of key files relevant to the plan
   3. Extract the REAL patterns used:
      - How does the codebase access theme? (useTheme vs theme arg?)
      - What types/interfaces patterns? (import type?)
      - What dependencies are actually imported vs declared?
      - HTML element choices, naming conventions, file structure
   4. Use these REAL patterns as ground truth — NOT the plan's code,
      if plan contradicts actual codebase patterns.
   
   ### Step 3C — Plan Validation (MANDATORY — DO NOT SKIP)
   
   Cross-check the plan's code/specs against workspace skills AND reference code:
   
   1. **Convention check**: Does plan follow discovered skill rules?
   2. **Type safety check**: Are nullable types accessed with optional chaining?
   3. **HTML semantics check**: Are elements correct? (No `<label>` wrapping interactive elements)
   4. **Dependency audit**: Do declared dependencies match actual imports?
   5. **Accessibility check**: role, aria-*, keyboard handling per skill rules
   
   Record ALL issues as `plan_issues` in your `reasoning` field.
   For each issue, inject a **CORRECTIVE instruction** into the affected task's `action` field.
   
   ### Step 3D — Task Decomposition (produce detailed tasks)
   
   Break plan into atomic tasks. Each task `action` field MUST contain:
   
   a) **Goal**: 1 sentence — what this task achieves
   b) **Files**: Exact workspace-relative paths to create/modify/delete
   c) **What to Do**: Detailed instructions including:
      - Code patterns from reference implementation (Step 3B), NOT plan if plan had bugs
      - Specific type signatures, import paths
      - Key implementation details with concrete values
   d) **Constraints**: 
      - ALWAYS include skill paths to read (from Step 3A)
      - Task-specific conventions discovered
      - If plan had bugs: "PLAN DEVIATION: [what to do instead]"
   e) **Done Criteria**: 3-8 checkable items specific to this task
   
   Each task `verification` field MUST contain:
   - Exact executable shell commands (e.g., "cd libs/switch && npx tsc --noEmit")
   - NEVER vague phrases like "Compile passes"
   
   ### Step 3E — Quality Self-Check (before submit_decomposition)
   
   Before calling submit_decomposition, verify:
   - [ ] Every task has file paths in its action
   - [ ] Every task references relevant skills
   - [ ] Every task has executable verification commands
   - [ ] Every task has 3+ done criteria
   - [ ] Plan bugs are noted and corrected in task constraints
   - [ ] Tasks are self-contained: Worker can execute without reading the plan
```

### Constraints
- Đọc file `prompts/agent-prompt.md` trước — tìm chính xác vị trí Section P Step 3
- Giữ nguyên Step 1, 2, 4 — chỉ thay Step 3
- Đảm bảo markdown indentation đúng (3 spaces cho sub-items)

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# Step 3A, 3B, 3C, 3D, 3E đều có trong file
grep -c "Step 3[A-E]" prompts/agent-prompt.md
# Expected: 5

# Keyword check
grep -c "Workspace Discovery" prompts/agent-prompt.md
grep -c "Reference Implementation Study" prompts/agent-prompt.md
grep -c "Plan Validation" prompts/agent-prompt.md
grep -c "Quality Self-Check" prompts/agent-prompt.md
```

## Done Criteria
- [ ] Step 3A (Workspace Discovery) có trong file
- [ ] Step 3B (Reference Implementation Study) có trong file
- [ ] Step 3C (Plan Validation) có trong file, bao gồm 5 checks
- [ ] Step 3D (Task Decomposition) có trong file, format action gồm Goal/Files/What to Do/Constraints/Done Criteria
- [ ] Step 3E (Quality Self-Check) có trong file, 6 checkbox items
- [ ] Step 1, 2, 4 không bị thay đổi
- [ ] Markdown render đúng (indentation check)
