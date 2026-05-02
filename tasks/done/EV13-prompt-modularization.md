# Task EV13: Prompt Modularization (SKILL.md Pattern)

## Info
- **ID:** EV13-prompt-modularization
- **Module:** prompts/, .agent/skills/
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV09b
- **Priority:** 13
- **Ref:** `prompt_review.md` v3 — Section 4.2 (Codex SKILL.md), Section 2 (compression)

## What to do

Extract planner-only content from `prompts/agent-prompt.md` into on-demand skill files.
Follows Codex 2026 SKILL.md on-demand loading pattern.

### 1. Extract Section P → planner skill
**[NEW] `.agent/skills/planner-protocol/SKILL.md`**
- Move Section P (Planning/Decomposition) full content
- Include: Step 3A cold start, Step 3B-3E decomposition rules
- Include: Planner-specific quality checklist

### 2. Extract task quality → skill
**[NEW] `.agent/skills/task-quality/SKILL.md`**
- Move Appendix A (task examples)
- Move quality checklist from Step 3D + 3E
- Reference from planner skill

### 3. Update core prompt
**[MODIFY] `prompts/agent-prompt.md`**
- Replace Section P full content with:
  ```
  ## Section P — Planning (Role: PLANNER)
  When assigned PLANNER role, read skill: `.agent/skills/planner-protocol/SKILL.md`
  for full planning and decomposition protocol.
  ```
- Remove Appendix A (moved to skill)
- Core prompt: ~280 lines (from ~455 = 38% reduction)

## Files
| Action | Path |
|--------|------|
| NEW    | `.agent/skills/planner-protocol/SKILL.md` |
| NEW    | `.agent/skills/task-quality/SKILL.md` |
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# 1. Core prompt under 300 lines
wc -l prompts/agent-prompt.md  # target: ~280

# 2. Skill files exist and contain full Section P content
cat .agent/skills/planner-protocol/SKILL.md | head -5

# 3. Agent test: assign PLANNER role → agent loads skill → decomposes correctly
```

## Done Criteria
- [x] Section P extracted to `.agent/skills/planner-protocol/SKILL.md`
- [x] Appendix A extracted to `.agent/skills/task-quality/SKILL.md`
- [x] Core prompt ≤ 300 lines
- [x] Core prompt references skills with clear load instructions
- [x] Worker agents skip planner skills entirely (no unnecessary reads)
- [x] Planner agents still have full decomposition protocol available
