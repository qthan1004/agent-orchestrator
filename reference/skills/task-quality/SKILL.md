---
name: Task Quality
description: Task decomposition quality reference with bad vs good examples and quality checklist. Referenced by planner-protocol skill.
---

# Task Quality — Bad vs Good

Use this reference when decomposing plans into tasks. Every task must be self-contained enough for a Worker to execute without reading the plan.

## ❌ BAD Task (insufficient — Worker will improvise and likely produce bugs)

```json
{
  "id": "03-styled",
  "module": "libs/switch",
  "action": "Create styled.tsx with styled components. CONSTRAINT: Strict scope.",
  "verification": "Compile passes."
}
```

**Why it's bad:**
- No file paths specified
- No code patterns or type signatures
- Verification is a vague phrase, not an executable command
- No done criteria
- Worker has to guess everything

## ✅ GOOD Task (Worker can execute correctly without additional context)

```json
{
  "id": "03-styled-components",
  "module": "libs/switch",
  "action": "Goal: Create src/lib/styled.tsx with 4 emotion styled components.\n\nFiles:\n- NEW: libs/switch/src/lib/styled.tsx\n\nWhat to Do:\n1. SwitchRootStyled — styled.div (NOT label). Flex container.\n2. SwitchTrackStyled — styled.button. Toggle track. Access theme via useTheme().\n   Background checked: palette?.primary?.main (optional chaining required).\n3. SwitchThumbStyled — styled.span. Circular thumb with left offset.\n4. SwitchLabelStyled — styled.span. Label text.\n\nConstraints:\n- Read: .agent/skills/component-patterns/SKILL.md\n- Use useTheme() NOT theme from styled args\n- All palette access MUST use optional chaining\n- PLAN DEVIATION: Plan says styled.label for Root — use styled.div instead\n\nDone criteria:\n- [ ] 4 styled components exported\n- [ ] useTheme() pattern used (not theme arg)\n- [ ] All palette access uses optional chaining\n- [ ] SwitchRootStyled uses div, not label\n- [ ] Executable verification passes",
  "verification": "cd libs/switch && npx tsc --noEmit -p tsconfig.lib.json"
}
```

**Why it's good:**
- Clear goal statement
- Exact file paths (NEW/MODIFY/DELETE)
- Detailed implementation instructions with concrete values
- Constraints referencing skills and PLAN DEVIATION notes
- Executable verification command
- 5 specific, checkable done criteria

## Quality Checklist (Step 3E)

Before calling `submit_decomposition`, verify every task against this checklist:

- [ ] Every task has file paths in its action
- [ ] Task `id`s do not contain any slashes (`/` or `\`)
- [ ] Every task references relevant skills
- [ ] Every task has executable verification commands
- [ ] Every task has 3+ done criteria
- [ ] Plan bugs are noted and corrected in task constraints
- [ ] Tasks are self-contained: Worker can execute without reading the plan
- [ ] Stories task is included (for lib plans)
- [ ] Unit test task is included (for lib plans)
- [ ] Documentation task is included (for lib plans)
- [ ] Scaffold includes `tsconfig.storybook.json` (for lib plans)
- [ ] `aria-current` is specified for navigation components (breadcrumb, tabs, nav)
- [ ] Tasks with no real dependency are grouped in parallel DAG groups
- [ ] MANIFEST uses actual git commit hash (not `new`, `initial`, etc.)
- [ ] **Test file paths match discovered convention** (e.g., `tests/X.spec.tsx` NOT `src/lib/X.spec.tsx`)
- [ ] **No verification command uses `--passWithNoTests`**
