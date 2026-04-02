---
description: Project structure and conventions to minimize token usage
---

# React Lib Workspace Context

## Structure
- **Workspace**: `react-lib-workspace` (yarn + nx)
- **Libs**: git submodules at `system-core-ui/<lib>` (`@thanh-libs/*`)
- **Builds**:
  - `utils`: `tsc` (vitest, standalone tsconfig)
  - `theme`, `dialog`, `typography`, `menu`: `vite build` (vitest, standalone tsconfig)
- **CI/CD**: `publish.yml` triggered by `v*` tags

## Conventions
- **tsconfig**: Standalone (no base extensions).
- **devDeps**: Full devDeps (vite, vitest, typescript) inside each lib's `package.json`.
- **Git**: Branch `master`. Workspace tracks submodule references.
- **a11y**: Strict WCAG 2.2 compliance (see `component-patterns`).

## Skills (`.agent/skills/`)

| Skill | Mô tả |
|-------|--------|
| `component-patterns` | React component structure, styled patterns, naming conventions |
| `testing-patterns` | Vitest + React Testing Library + jest-axe boilerplate |
| `git-commit-convention` | Commit message format |
| `styled-theme-convention` | Emotion styled + theme token usage |
| `task-delegation` | Planner/Worker protocol, ticket template |
| `check-deps` | `@thanh-libs/*` dependency audit across all libs |
| `strict-scope` | Do ONLY what user asked — no extra refactors |
| `token-optimization` | Context management, Index Pattern, Turn Limit |

## Workflows (`.agent/workflows/`)

| Workflow | Mô tả |
|----------|--------|
| `/create-lib` | Scaffold lib mới từ templates |
| `/publish-lib` | Release branch → alpha → official → merge |
| `/git-push` | Push workspace / 1 lib / all libs |
| `/delegate` | Planner mode — tạo atomic task tickets |
| `/execute-task` | Worker Agent — đọc ticket và thực thi |
| `/pick-task` | List tasks todo/blocked → chọn → execute |
| `/test-lib` | Test manual qua Storybook — duyệt stories, ghi log |
| `/save-plan` | Lưu plan vào `plan/` theo format chuẩn |
| `/save-bug-report` | Lưu bug report theo standardized format |
| `/check-deps` | Chạy dependency audit across all libs |
| `/clear-nexus` | Clear internal Nexus registry URLs |

## Task Delegation (Planner → Worker)
- **Workflow**: `/delegate` — kích Planner mode, tạo ticket vào `plan/tasks/todo/`
- **Skill**: `.agent/skills/task-delegation/SKILL.md` — protocol chi tiết
- **Template**: `.agent/skills/task-delegation/template.md` — format ticket chuẩn
- **Directories**: `plan/tasks/todo/` → `done/` | `blocked/`

## Bulk Tools (`tools/`)

| Script | Mô tả |
|--------|--------|
| `git-push.sh` | Commit + push (workspace / 1 lib / all libs) |
| `apply-all-libs.sh run` | Chạy 1 command cho tất cả libs (fail on error) |
| `apply-all-libs.sh check` | Kiểm tra/inspect tất cả libs (skip errors) |
| `apply-all-libs.sh sync` | Copy file vào tất cả libs |
| `gen-lib.sh` | Scaffold lib mới từ `tools/templates/` |
| `git-setup-lib.sh` | Git submodule setup cho lib mới |
| `publish-lib.sh` | Publish script (dùng qua `/publish-lib` workflow) |
| `check-lib-deps.sh` | Dependency check script |
| `clear-nexus.sh` | Clear Nexus registry URLs |

- **Timeout Rule**: Stop any command exceeding 30s with no output.

## Templates (`tools/templates/`)
- `package.json`, `vite.config.mts`, `publish.yml`
- `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `tsconfig.storybook.json`
- `check-deps.mjs`, `.gitignore`
- `.storybook/` config, `stories/` boilerplate, `tests/` setup
