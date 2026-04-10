# Task PQ06: Thêm Appendix A + B vào agent-prompt.md

## Info
- **ID:** PQ06-prompt-add-appendices
- **Module:** prompts
- **Group:** 2 (Prompt — Appendix)
- **Dependencies:** PQ03, PQ04, PQ05
- **Priority:** 6
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md` → "Change 4"

## What to do

### Goal
Thêm 2 appendices vào cuối `prompts/agent-prompt.md`: 
- Appendix A: Bad vs Good task example (cho model "thấy" format chuẩn)
- Appendix B: Workspace Discovery Cache (hướng dẫn cache giữa các plans)

### Nội dung append

Thêm vào cuối file (sau content hiện tại):

````markdown
---

## Appendix A: Task Quality — Bad vs Good

### ❌ BAD Task (insufficient — Worker will improvise and likely produce bugs)
```json
{
  "id": "03-styled",
  "module": "libs/switch",
  "action": "Create styled.tsx with styled components. CONSTRAINT: Strict scope.",
  "verification": "Compile passes."
}
```

### ✅ GOOD Task (Worker can execute correctly without additional context)
```json
{
  "id": "03-styled-components",
  "module": "libs/switch",
  "action": "Goal: Create src/lib/styled.tsx with 4 emotion styled components.\n\nFiles:\n- NEW: libs/switch/src/lib/styled.tsx\n\nWhat to Do:\n1. SwitchRootStyled — styled.div (NOT label). Flex container.\n2. SwitchTrackStyled — styled.button. Toggle track. Access theme via useTheme().\n   Background checked: palette?.primary?.main (optional chaining required).\n3. SwitchThumbStyled — styled.span. Circular thumb with left offset.\n4. SwitchLabelStyled — styled.span. Label text.\n\nConstraints:\n- Read: .agent/skills/component-patterns/SKILL.md\n- Use useTheme() NOT theme from styled args\n- All palette access MUST use optional chaining\n- PLAN DEVIATION: Plan says styled.label for Root — use styled.div instead\n\nDone criteria:\n- [ ] 4 styled components exported\n- [ ] useTheme() pattern used (not theme arg)\n- [ ] All palette access uses optional chaining\n- [ ] SwitchRootStyled uses div, not label\n- [ ] Executable verification passes",
  "verification": "cd libs/switch && npx tsc --noEmit -p tsconfig.lib.json"
}
```

---

## Appendix B: Workspace Discovery Cache

When working with the same `workspace_root` across multiple plans:
- Skills, context.md, and reference patterns rarely change between plans
- On first plan: do full discovery (Step 3A + 3B)
- On subsequent plans in same session: re-read only if plan targets a different module
- Always re-validate (Step 3C) for every plan — plan bugs are per-plan
````

### Constraints
- Append vào cuối file — KHÔNG sửa content hiện tại
- Giữ đúng JSON format trong example (escaped newlines `\n`)
- Đảm bảo code fence đúng (```json inside ````markdown)

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# Appendix headers exist
grep -c "Appendix A" prompts/agent-prompt.md
grep -c "Appendix B" prompts/agent-prompt.md

# Bad/Good examples exist
grep -c "BAD Task" prompts/agent-prompt.md
grep -c "GOOD Task" prompts/agent-prompt.md

# Cache section exists
grep -c "Workspace Discovery Cache" prompts/agent-prompt.md
```

## Done Criteria
- [x] Appendix A header "Task Quality — Bad vs Good" có trong file
- [x] BAD task JSON example có trong file
- [x] GOOD task JSON example có trong file, bao gồm: Goal, Files, What to Do, Constraints, Done criteria, PLAN DEVIATION
- [x] Appendix B header "Workspace Discovery Cache" có trong file
- [x] 4 bullet points về cache strategy có trong file
- [x] Content hiện tại không bị thay đổi
