# Test Result: `@thanh-libs/switch` v0.0.1 — Prompt Enhancement v2

> **Date**: 2026-04-10  
> **Plan tested**: `plan/done/2026-04-07_switch_v0.0.1.md`  
> **Tasks analyzed**: `exchange/outbox/task-{01..05}-*.json`  
> **Method**: Manual review tại workspace so sánh với orchestrator output  
> **Overall Score**: **4.5/10**  
> **Target**: **≥ 8.0/10** (80-85% of manual delegate quality)

---

## 1. Quality Gap Analysis — Orchestrator vs Manual `/delegate`

### 1.1 Benchmark: Manual ticket quality (from `plan/tasks/done/`)

Tickets tạo thủ công qua `/delegate` workflow đạt chuẩn cao:
- `03-menu-apply-colorscheme-styled.md`: **209 lines**, chi tiết đến từng dòng code cần sửa, bảng token map, code snippet cho từng component, 11 done criteria items
- `01-menu-deps-types-constants.md`: **110 lines**, rõ file paths, exact code blocks, verification commands

### 1.2 Orchestrator ticket (hiện tại):

```json
{
  "id": "03-styled-components",
  "module": "libs/switch",
  "action": "Create src/lib/styled.tsx with SwitchRootStyled, SwitchTrackStyled, SwitchThumbStyled, SwitchLabelStyled. Apply transitions and theme colors. CONSTRAINT: Strict scope - exact elements only.",
  "verification": "Compile passes."
}
```

**4 lines. Không file paths, không skill refs, không code guidance, không done criteria, verification = "Compile passes" (không executable).**

### 1.3 GAP Breakdown

| Dimension | Manual Ticket | Orchestrator Task | Gap | Weight |
|-----------|--------------|-------------------|-----|--------|
| **Instruction detail** | Exact code snippets, line-by-line guidance | 1-line summary | 🔴 95% gap | 30% |
| **File references** | Absolute paths + action table | Module name only | 🔴 100% gap | 10% |
| **Skill injection** | Paths to SKILL.md + inlined rules | "Strict scope" text only | 🔴 90% gap | 20% |
| **Verification** | Exact bash commands | "Compile passes" | 🔴 90% gap | 10% |
| **Done criteria** | 6-11 checkable items | None | 🔴 100% gap | 10% |
| **Plan validation** | Human catches bugs before delegating | Zero validation | 🔴 100% gap | 15% |
| **Dependency docs** | "Ticket X phải xong (cần import Y)" | DAG group only | 🟡 50% gap | 5% |

**Weighted gap score**: ~87% — nghĩa là orchestrator chỉ đạt ~13% chất lượng manual.

---

## 2. Root Cause Chain

```
1. Plan contains bugs (no one validates plan quality before decomposing)
     ↓
2. Planner reads context.md + skills/ but does NOT:
   a. Validate plan code against skill rules
   b. Read actual existing lib code for pattern reference  
   c. Inject skill content INTO task descriptions
     ↓
3. Tasks are 4-line JSONs — Workers get zero context about:
   a. Which skills to follow
   b. What conventions apply
   c. What code pattern to use
   d. How to actually verify
     ↓
4. Workers improvise → copy plan blindly → bugs ship
```

---

## 3. Bugs Found in Output Code

| # | Bug | File | Severity | Root Cause |
|---|-----|------|----------|-----------|
| 1 | `styled.label` bọc `<button onClick>` → double-toggle | `styled.tsx:5` | 🔴 Critical | Plan sai |
| 2 | `theme.palette[color].main` — palette is optional → crash | `styled.tsx:30,39,62` | 🔴 Critical | Plan sai + thiếu skill |
| 3 | `@thanh-libs/utils` phantom peer dep | `package.json:30` | 🟡 Medium | Plan inconsistent |
| 4 | Styled dùng `theme` arg thay vì `useTheme()` | `styled.tsx:21` | 🟡 Medium | Skill `component-patterns` rule 19 bị bỏ qua |
| 5 | Thumb thiếu `left: 2` offset | `styled.tsx:48` | 🟡 Medium | Plan thiếu detail |
| 6 | Raw px thay vì `pxToRem()` | `constants` | 🟢 Low | Không follow theme-first |
| 7 | No unit tests | `tests/` | 🟢 Low | Plan + tasks không yêu cầu |

---

## 4. Enhancement Spec — Target ≥ 80% Manual Quality

### 4.1 🔴 [CRITICAL] Section P Step 3 — Complete Rewrite

**Current** (3 bullet points, ~6 lines):
```
3. [Mode B] Read the plan content. CRITICAL: AUTO-DISCOVERY PHASE
   - BEFORE decomposing, explore workspace_root
   - Read context.md, list skills/ and tools/
   - Inject discovered rules into task constraints
```

**Required** (full rewrite of Step 3):

```markdown
3. **[Mode B]** Receive plan content. Execute the following sub-steps IN ORDER:

   ### Step 3A — Workspace Discovery (MANDATORY)
   
   Read ALL of the following (skip only if file doesn't exist):
   
   1. `workspace_root/.agent/context.md` — project conventions, skill index
   2. Each skill in `workspace_root/.agent/skills/*/SKILL.md` — read ALL skills
   3. `workspace_root/.agent/skills/task-delegation/template.md` — ticket format
   4. `workspace_root/.agent/workflows/` — list them, read `/delegate` workflow
   
   **Cache and internalize the discovered rules.** You will inject them into tasks.
   
   ### Step 3B — Reference Implementation Study (MANDATORY for new components)
   
   If the plan creates a NEW component/lib:
   1. Find the most similar existing lib in `workspace_root/libs/` 
      (e.g., `chip` for `switch`, `button` for `icon-button`)
   2. READ the actual source code of: `styled.tsx`, component file, 
      `models/index.ts`, `constants/index.ts`, `package.json`
   3. Extract the REAL patterns used:
      - How does styled.tsx access theme? (useTheme vs theme arg?)
      - What types/interfaces pattern? (import type?)
      - What dependencies are actually imported vs declared?
      - HTML element choices (div, span, button, label?)
   4. Use these REAL patterns as ground truth — NOT the plan's code,
      if plan contradicts actual lib patterns.
   
   ### Step 3C — Plan Validation (MANDATORY — DO NOT SKIP)
   
   Cross-check the plan's code against workspace skills AND reference lib:
   
   1. **Styled convention check**: Does plan's styled code follow 
      `component-patterns` SKILL? (useTheme vs theme arg, object style 
      only, owner prefix, Styled suffix)
   2. **Type safety check**: Are nullable types accessed with optional 
      chaining? (ThemeSchema.palette is optional — plan code MUST use 
      `palette?.primary?.main`, NOT `palette.primary.main`)
   3. **HTML semantics check**: Are elements semantically correct? 
      (No `<label>` wrapping `<button>` — causes double-trigger. 
      No `<div onClick>` — use `<button>` for interactives.)
   4. **Dependency audit**: Do declared `peerDependencies` match actual 
      imports in plan code? Flag phantom deps not imported anywhere.
   5. **Accessibility check**: `role`, `aria-*` attributes, keyboard 
      handling, focus management — per skill rules.
   
   Record ALL issues found as `plan_issues` in your `reasoning` field.
   For each issue, inject a CORRECTIVE instruction into the affected 
   task's `action` field — do NOT silently propagate plan bugs.
   
   ### Step 3D — Task Decomposition (produce high-quality tasks)
   
   Break plan into atomic tasks. Each task's `action` field MUST contain 
   ALL of the following (modeled after workspace template.md format):
   
   **REQUIRED in every task `action` field:**
   
   a) **Goal**: 1 sentence — what this task achieves
   b) **Files**: Exact workspace-relative paths to create/modify/delete
   c) **What to Do**: Detailed instruction paragraphs. Include:
      - Exact code patterns to follow (from reference lib, NOT plan if 
        plan was found to have bugs)
      - Specific type signatures, import paths
      - For styled components: which theme tokens to use, and HOW 
        (e.g., "palette?.primary?.main — optional chaining required")
   d) **Constraints**: 
      - ALWAYS include: "Read and follow: .agent/skills/component-patterns/SKILL.md"
      - ALWAYS include: "Read and follow: .agent/skills/strict-scope/SKILL.md"
      - Add any task-specific conventions (e.g., "use useTheme() NOT theme arg")
      - If plan had bugs in this area, add: "PLAN DEVIATION: [what to do instead]"
   e) **Done criteria**: 3-8 checkable items specific to this task
   
   **REQUIRED in every task `verification` field:**
   - Exact executable shell commands (e.g., "cd libs/switch && npx tsc --noEmit -p tsconfig.lib.json && npx vite build")
   - NEVER use vague phrases like "Compile passes" or "Stories build correctly"
   
   ### Step 3E — Quality Self-Check (before submit_decomposition)
   
   Before calling submit_decomposition, verify:
   - [ ] Every task has file paths in its action
   - [ ] Every task references at least `component-patterns` skill
   - [ ] Every task has executable verification commands
   - [ ] Every task has 3+ done criteria
   - [ ] Plan bugs are noted and corrected in task constraints
   - [ ] Tasks are self-contained: Worker can execute without reading plan
```

---

### 4.2 🔴 [CRITICAL] Section W Step 3 — Worker Execution Protocol  

**Current** (1 line): `Read task_details inline. Execute the required changes.`

**Required** (expanded):

```markdown
3. **[Mode B]** Read `task_details`. Execute with the following protocol:
   
   ### Step 3A — Pre-flight (before writing any code)
   
   1. Read ALL skills referenced in the task's constraints
      (e.g., `.agent/skills/component-patterns/SKILL.md`)
   2. If task says "reference lib X" or file paths include a new component:
      - Read the actual source of the most similar existing lib
      - Use it as your code pattern template
   3. Parse the task's done criteria — these are your acceptance tests
   
   ### Step 3B — Implementation
   
   - Follow skill rules STRICTLY — they override your own preferences
   - Follow task constraints STRICTLY — especially "PLAN DEVIATION" notes
   - Use patterns from reference lib, not improvised patterns
   
   ### Step 3C — Self-Validation (MANDATORY before complete_task)
   
   1. Run the ACTUAL verification command(s) from the task
      (do NOT skip — do NOT assume success)
   2. Walk through each done criteria item mentally:
      - Is each one satisfied by your code?
   3. Cross-check against key skill rules:
      - styled.tsx: using useTheme() not theme arg?
      - All palette/theme access has optional chaining?
      - No phantom dependencies in package.json?
      - Correct HTML semantics (no label wrapping button)?
   4. If ANY check fails → fix before completing
```

---

### 4.3 🟡 [HIGH] Rules & Constraints Section — Add Critical Rules

**Add to Section 4:**

```markdown
7. **Plan is NOT gospel**: Plans may contain bugs. When decomposing, 
   validate plan code against workspace skills and real lib code. 
   Workers: if task constraints say "PLAN DEVIATION", follow the 
   constraint, not the plan.
   
8. **Self-contained tasks**: Each task must contain enough detail that 
   a Worker with NO knowledge of the plan can execute it correctly. 
   Include code patterns, skill paths, verification commands, and done 
   criteria inline in the task.
   
9. **Reference-first coding**: When creating a new component, ALWAYS 
   read the most similar existing lib's actual code first. Use its 
   real patterns, not guessed patterns.
   
10. **Verification means execution**: "Compile passes" is NOT 
    verification. Run the actual command. Report the output.
```

---

### 4.4 🟡 [HIGH] Example Task — Include as Reference

**Add appendix to prompt with a CONCRETE example of good vs bad task:**

```markdown
## Appendix: Task Quality Examples

### ❌ BAD Task (insufficient for Worker)
{
  "id": "03-styled",
  "module": "libs/switch",
  "action": "Create styled.tsx with styled components. CONSTRAINT: Strict scope.",
  "verification": "Compile passes."
}

### ✅ GOOD Task (Worker can execute without additional context)
{
  "id": "03-styled-components",
  "module": "libs/switch",
  "action": "Goal: Create src/lib/styled.tsx with 4 emotion styled components.\n\nFiles:\n- NEW: libs/switch/src/lib/styled.tsx\n\nWhat to Do:\n1. SwitchRootStyled — styled.div (NOT label — label wrapping button causes double-toggle). Flex container for track + label. Props: ownerLabelPlacement, ownerDisabled.\n2. SwitchTrackStyled — styled.button. The toggle track. Props: ownerSize, ownerColor, ownerChecked, ownerDisabled. Access theme via: const { palette }: ThemeSchema = useTheme(). Background checked: palette?.primary?.main (optional chaining required). Background unchecked: palette?.action?.disabled.\n3. SwitchThumbStyled — styled.span. Circular thumb, position absolute with left offset matching padding. translateX for animation. Props: ownerSize, ownerChecked.\n4. SwitchLabelStyled — styled.span. Label text. Props: ownerSize, ownerDisabled.\n\nConstraints:\n- Read and follow: .agent/skills/component-patterns/SKILL.md\n- Use useTheme() inside callback — NOT theme from styled args\n- Object style only ({ key: value }) — no template literals\n- All palette access MUST use optional chaining (palette?.xxx?.yyy)\n- Prefix custom props with 'owner', suffix component names with 'Styled'\n- PLAN DEVIATION: Plan says styled.label for Root — use styled.div instead\n\nDone criteria:\n- 4 styled components exported\n- useTheme() pattern used (not theme arg)\n- All palette access uses optional chaining\n- SwitchRootStyled uses div, not label\n- Thumb has left offset matching track padding",
  "verification": "cd libs/switch && npx tsc --noEmit -p tsconfig.lib.json"
}
```

---

## 5. Implementation Checklist

```
Phase 1 (prompt-only changes — apply to prompts/agent-prompt.md):
├── [4.1] Section P Step 3 — full rewrite with 5 sub-steps
│   ├── 3A: Workspace Discovery (read ALL skills, context, template)
│   ├── 3B: Reference Implementation Study (read existing lib code)
│   ├── 3C: Plan Validation (cross-check plan vs skills + real code)
│   ├── 3D: Task Decomposition (rich format matching template.md)
│   └── 3E: Quality Self-Check (pre-submit validation)
│
├── [4.2] Section W Step 3 — expanded execution protocol
│   ├── 3A: Pre-flight (read skills + reference lib)
│   ├── 3B: Implementation (strict skill compliance)
│   └── 3C: Self-Validation (run verification + done criteria check)
│
├── [4.3] Section 4 Rules — add rules 7-10
│
└── [4.4] Appendix — Bad vs Good task example
```

---

## 6. Expected Impact (Revised)

### Scoring Model

| Dimension | Weight | Before | After | Improvement Source |
|-----------|--------|--------|-------|-------------------|
| Plan validation | 15% | 0/10 | 8/10 | Step 3C catches bugs before decompose |
| Task instruction detail | 30% | 1/10 | 8/10 | Step 3D enforces template format |
| Skill compliance | 20% | 1/10 | 8/10 | Step 3A reads ALL skills + Step 3D injects |
| Reference accuracy | 10% | 0/10 | 9/10 | Step 3B reads actual lib code |
| Verification quality | 10% | 1/10 | 9/10 | Exact commands enforced |
| Done criteria | 10% | 0/10 | 8/10 | 3-8 items required per task |
| Dependency docs | 5% | 5/10 | 7/10 | DAG + text explanation |

### Result

| Metric | Before | After (target) |
|--------|--------|----------------|
| **Weighted score** | **1.2/10 (12%)** | **8.2/10 (82%)** |
| Plan bugs reaching Workers | 100% pass-through | ~15% (3C catches most) |
| Task quality vs manual template | ~13% match | ~80% match |
| Worker retry rate | 50% | ~10% |
| Convention compliance | ~15% | ~80% |
| **Overall quality vs manual** | **~13%** | **~80-85%** |

### What Prevents Reaching 90%+

Prompt-only fixes cap at ~85% because:
1. **No runtime type-checking**: Can't compile plan code to find type errors automatically
2. **Token budget**: Very detailed tasks consume more context → may hit limits on complex plans
3. **Model capability**: Planner's ability to cross-reference 5+ skills + reference lib + plan simultaneously depends on model context quality
4. **No feedback loop**: Workers can't flag issues back to Planner for re-decomposition

Reaching 90%+ requires server-side features: plan linting, task schema validation, Worker→Planner feedback channel.

---

## 7. Key Difference From Previous Version

| Aspect | v1 Enhancement (7.5/10) | v2 Enhancement (8.2/10) |
|--------|------------------------|------------------------|
| Skill handling | "Discover and inject" (vague) | "Read ALL skills, inline rules into task action" (specific) |
| Plan validation | General "cross-check" | 5-point checklist (styled, types, HTML, deps, a11y) |
| Reference lib | Not mentioned | Mandatory: read actual code of similar existing lib |
| Task format | "Be detailed" guidance | Exact required sections (Goal, Files, What to Do, Constraints, Done Criteria) with concrete example |
| Worker protocol | "Self-validate" | 3-step pre-flight + implementation + validation with checklist |
| Example | Not included | Full BAD vs GOOD task JSON comparison |
| Quality gate | None | Step 3E self-check before submit_decomposition |
