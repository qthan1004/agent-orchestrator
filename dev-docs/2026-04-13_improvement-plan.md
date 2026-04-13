# Improvement Plan: Post Switch Test Run

Based on evaluation: `dev-docs/2026-04-13_switch-test-run-evaluation.md`

---

## Priority 1 — Knowledge & Cache Quality

### 1.1 MANIFEST phải dùng actual git hash

**Vấn đề**: Planner ghi `hash: new` thay vì commit hash thực → cache invalidation sẽ fail.

**Hành động — Prompt improvement** (`prompts/agent-prompt.md`):
- Section P, Step 3A.6: Thêm enforcement rõ hơn:
  > You MUST run `git log -1 --format="%H" -- <module>` and use the EXACT hash. 
  > `new`, `initial`, or any non-hash string is REJECTED.

- Có thể thêm validation ở server-side trong `submit_decomposition`: check MANIFEST format.

### 1.2 Knowledge depth enforcement

**Vấn đề**: `project_knowledge.md` quá sơ sài, thiếu:
- `alpha()` utility
- `spacing` token usage (gap, padding, margin nên dùng `spacing.small` thay vì `pxToRem(8)`)
- `helpers.ts` extraction pattern
- Hover/active/focus-visible cascade
- Git submodule workflow

**Hành động — Template improvement** (`templates/knowledge.md`):
- Thêm Section 5: **Utility Functions** (`pxToRem`, `alpha`, spacing tokens)
- Thêm Section 6: **Styling Token Convention** — khi nào dùng spacing vs hardcoded

**Hành động — Prompt improvement**:
- Step 3A.8: Thêm rule: _"Knowledge must document ALL shared utilities, theme tokens, and styling conventions discovered during Deep Discovery."_

---

## Priority 2 — Task Completeness

### 2.1 Planner PHẢI include test + doc tasks

**Vấn đề**: Switch thiếu unit tests và README — chip manual có cả hai.

**Hành động — Prompt improvement** (`prompts/agent-prompt.md`):
- Section P, Step 3D: Thêm mandatory checklist trước khi submit_decomposition:
  > Every lib plan MUST include:
  > - [ ] Unit test task (at minimum: render, props, a11y, keyboard)
  > - [ ] Documentation task (README.md from template, CHANGELOG.md)
  > - [ ] Scaffold supporting files (.gitignore, check-deps.mjs from reference)

### 2.2 Spacing token convention enforcement

**Vấn đề**: `gap: pxToRem(8)` → phải dùng `spacing?.small` từ theme.

**Hành động — Knowledge update**:
- Thêm convention vào `project_knowledge.md` Section 4:
  > **Spacing Rule**: NEVER hardcode spacing values with `pxToRem()`. 
  > Use `theme.spacing.*` tokens: tiny(4), small(8), medium(12), large(16), extraLarge(24).

---

## Priority 3 — DAG Parallelism (Planner)

**Vấn đề**: Task 01 (scaffold) và 02 (models) chạy linear nhưng không có dependency thực.

**Hành động — Prompt improvement**:
- Section P, Step 3D: Thêm:
  > Identify tasks that have NO real dependency and group them as parallel. 
  > A model/types task does NOT depend on scaffold/config files.

---

## Priority 4 — Multi-session Role Stability (LOWEST)

**Vấn đề**: Khi chạy 2 session cùng lúc, task assignment và role transitions bị loạn.

**Hành động — Server code investigation**:
- Audit `get_next_task` + `complete_task` + role election logic cho race conditions
- Audit `resolveIdleAction` khi multiple workers active
- Có thể cần mutex/lock cho task assignment
- Audit `workerRegistry.getActivePlanner()` threshold khi multiple planners exist

**Scope**: Đây là infrastructure bug, cần deep investigation riêng. Priority THẤP HƠN cả migrate-to-typescript.

---

## Verification

Sau khi apply improvements:
1. Chạy lại switch plan → check knowledge có đủ depth không
2. Chạy breadcrumb plan (minimal spec) → check planner có tự bổ sung test + doc tasks không
3. Test 2-session run → check role/task stability
