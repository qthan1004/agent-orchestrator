# Task PQ05: Thêm Rules 7-12 vào Section 4

## Info
- **ID:** PQ05-prompt-add-rules-7-12
- **Module:** prompts
- **Group:** 2 (Prompt — Rules)
- **Dependencies:** none
- **Priority:** 5
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md` → "Change 3"

## What to do

### Goal
Append 6 rules mới (7-12) vào Section 4 Rules trong `prompts/agent-prompt.md`, sau rule 6 hiện tại.

### Nội dung append

Thêm ngay sau rule 6:

```markdown
7. **Plan is NOT gospel**: Plans may contain bugs. When decomposing,
   validate plan code against workspace skills and real codebase patterns. 
   Workers: if task constraints say "PLAN DEVIATION", follow the constraint, not the plan.
   
8. **Self-contained tasks**: Each task must contain enough detail that 
   a Worker with NO prior knowledge can execute it correctly. 
   Include code patterns, skill paths, verification commands, and done criteria.
   
9. **Reference-first coding**: ALWAYS read the most similar existing code first. 
   Use its real patterns as ground truth.
   
10. **Verification means execution**: Run the actual command. Report the output. 
    Vague phrases like "Compile passes" are NOT verification.

11. **Self-check before done**: NEVER mark a task as "done" unless ALL done criteria 
    are verified. If done criteria are missing, create your own checklist based on 
    the task's goal and constraints.

12. **Heartbeat for long tasks**: If a task takes > 60 seconds, call `report_progress` 
    at least once every 60s. This prevents false stale-worker detection.
```

### Constraints
- Tìm chính xác rule 6 — append SAU nó
- Không sửa rules 1-6 hiện tại
- Đảm bảo numbering liên tục (7, 8, 9, 10, 11, 12)

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# Count total rules
grep -cE "^[0-9]+\." prompts/agent-prompt.md

# Verify new rules exist
grep -c "Plan is NOT gospel" prompts/agent-prompt.md
grep -c "Self-contained tasks" prompts/agent-prompt.md
grep -c "Reference-first coding" prompts/agent-prompt.md
grep -c "Verification means execution" prompts/agent-prompt.md
grep -c "Self-check before done" prompts/agent-prompt.md
grep -c "Heartbeat for long tasks" prompts/agent-prompt.md
```

## Done Criteria
- [ ] Rule 7 "Plan is NOT gospel" có trong file
- [ ] Rule 8 "Self-contained tasks" có trong file
- [ ] Rule 9 "Reference-first coding" có trong file
- [ ] Rule 10 "Verification means execution" có trong file
- [ ] Rule 11 "Self-check before done" có trong file
- [ ] Rule 12 "Heartbeat for long tasks" có trong file
- [ ] Rules 1-6 không bị thay đổi
