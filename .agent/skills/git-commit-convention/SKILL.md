---
name: Git Commit Convention
description: Conventional Commits format for all git messages. Always apply when committing.
---

# Git Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for all git messages.

## Format

```
<type>(<scope>): <description>

[optional body]
```

## Types

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change (no new feature, no fix) |
| `docs` | Documentation only |
| `chore` | Build, config, tooling changes |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

## Scope

Use module or area name: `agent-runner`, `llm-adapter`, `state-manager`, `planner`, etc.

## Examples

```
feat(agent-runner): add one-shot executor with tool loop
fix(state-manager): resolve workspace path for multi-workspace
refactor(config): split AppConfig into GlobalConfig + WorkspaceConfig
docs(readme): update Phase 2 architecture section
chore(deps): upgrade @modelcontextprotocol/sdk to 1.12
```

## Rules

- **Lowercase** description, no period at end
- **Imperative mood**: "add" not "added" or "adds"
- Body: explain **why**, not what (the diff shows what)
- Breaking changes: add `BREAKING CHANGE:` in footer or `!` after type
