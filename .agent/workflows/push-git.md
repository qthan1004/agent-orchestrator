---
description: Stage changes, commit with Conventional Commits format, and push to Git remote.
---

# Push Git

Push code to Git following Conventional Commits convention.

## Steps

### 1. Check status
// turbo
```bash
git status --short
```
→ If **clean** (no output) → stop, report "Nothing to push."

### 2. View diff
// turbo
```bash
git diff --stat
```
→ Overview of changed files to determine correct `type` and `scope`.

### 3. Stage changes

```bash
git add -A
```

### 4. Create commit message

**Format**: `<type>(<scope>): <subject>`

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructure (no feature/fix) |
| `docs` | Documentation only |
| `chore` | Build, tooling, config, dependencies |
| `test` | Add/modify tests |
| `style` | Code formatting (no logic change) |
| `perf` | Performance improvement |

**Scope** (optional): affected module/area (e.g., `server`, `state-manager`, `tools`).
**Subject**: imperative present tense, no capital first letter, no period.

```bash
git commit -m "<type>(<scope>): <subject>"
```

**Examples**:
```bash
git commit -m "feat(server): add long-poll support for get_next_task"
git commit -m "fix(state-manager): handle race condition in moveToActive"
git commit -m "docs: update README with multi-session setup"
```

### 5. Push to remote

```bash
git push
```

If first push or no upstream:
```bash
git push -u origin <branch-name>
```

### 6. Confirm
// turbo
```bash
git log --oneline -1
```

Report:
```
✅ Pushed: <commit message>
   Branch: <branch-name>
   Files changed: <count>
```
