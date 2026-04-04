---
description: Git commit messages must follow Conventional Commits format for standard-version compatibility
---
# Git Commit Convention

**Format:** `<type>(<scope>): <subject>` (Subject: imperative present tense, no capital first letter, no period at end).
Scope is optional (e.g., `dialog`, `theme`). Breaking changes use `!` after type or have `BREAKING CHANGE:` in body.

| Type | Description | Version |
|---|---|---|
| `feat` / `fix` / `perf` | New feature (minor) / Bug fix (patch) / Perf tweak (patch) | Bumps version |
| `refactor`, `style`, `docs`, `chore`, `test`, `ci` | Formatting, code structure, build/tooling, actions, tests | No bump |

**Examples:**
`feat(dialog): add size presets`
`fix(theme): resolve z-index bug`
`chore: remove nexus registry`
