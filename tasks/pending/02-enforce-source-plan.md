# Task 02: Enforce Source Plan provided by Planner

## Vấn đề
Planner không truyền filename của plan đang decompose vào `submit_decomposition`, dẫn đến việc plan không được move tự động sang `done/`.

## Actions
1. **[MODIFY] `prompts/agent-prompt.md`**
   - Sửa step 4 của **Section P** (Planner Mode).
   - Enforce truyền `source_plan` (filename, vd: `"2026-04-07_my-plan.md"`).
   - Nhắc agent server tự auto-move vào `done/`, do NOT skip parameter này.
