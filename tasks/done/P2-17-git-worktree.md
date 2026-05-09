# Task P2-17: Git Worktree Isolation

## Info
- **ID:** P2-17-git-worktree
- **Module:** `src/worker/git-worktree.ts` (NEW)
- **Group:** Sprint 3 (Server Dispatch Integration)
- **Dependencies:** P2-06
- **Priority:** 11
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Addendum Update 3

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `GitWorktreeManager` — branch isolation via `git worktree`.

### API:
- `create(workspaceRoot, branchName)` → `git worktree add <path> <branch>` → return worktree path
- `remove(worktreePath)` → `git worktree remove <path>`
- `list(workspaceRoot)` → list active worktrees

### Usage:
- Worker receives worktree path as `workspace_root` instead of main repo
- Server creates worktree before spawn, removes after task completion/crash
- **Optional**: Only used when task has `branch` field. Skip if no branch.

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/git-worktree.ts` |

## Done Criteria
- [x] `create()` → worktree dir exists, isolated from main
- [x] Worker sandbox scoped to worktree path
- [x] `remove()` → worktree cleaned up
- [x] Skip when task has no branch requirement
