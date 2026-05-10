# Task P2-20: Workspace Scope Contract

## Info
- **ID:** P2-20-workspace-scope-contract
- **Module:** `src/config.ts`, `src/models/`, runtime layout
- **Group:** Architecture Core
- **Dependencies:** None
- **Priority:** 1
- **Ref:** Workspace-scoped IPC and memory

## What to do

Define workspace identity and all workspace-scoped runtime roots as hard contract.

### Must define

- `workspace_path` as required registration input
- `workspace_id` derivation from registered path
- IPC root per workspace
- state/checkpoint/log/signal roots per workspace
- memory/case-bank roots per workspace

### Rules

- No implicit workspace discovery
- No mixing state across workspaces by default
- Any global/shared memory must be explicitly separated

## Done Criteria
- [ ] Workspace identity contract defined
- [ ] Runtime path layout defined
- [ ] Registration requirement documented
- [ ] Global vs workspace-local boundaries documented
