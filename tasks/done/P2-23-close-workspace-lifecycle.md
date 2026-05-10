# Task P2-23: Close Workspace Lifecycle

## Info
- **ID:** P2-23-close-workspace-lifecycle
- **Module:** `src/mcp-server/`, `src/utils/workspace-registry.ts`, runtime lifecycle
- **Group:** Architecture Core
- **Dependencies:** P2-20, P2-21, P2-22
- **Priority:** 4
- **Ref:** Multi-workspace server control

## What to do

Add a safe mechanism to close or detach a workspace from the running server when it is no longer needed.

### Required behavior

- server can close a registered workspace explicitly
- closed workspace stops accepting new plans and new task assignment
- active planners/workers tied to that workspace are handled deterministically
- runtime state is preserved on disk unless explicit deletion is requested elsewhere
- workspace status is visible as active vs closed/detached

### Must decide

- whether close is hard reject when active tasks exist
- or close performs graceful drain before detaching
- exact status model for registered workspaces

### Rules

- Close must never delete project files
- Close must not destroy runtime state by default
- Close must not affect unrelated workspaces on the same server

## Done Criteria
- [x] Workspace close/detach contract is defined
- [x] Closed workspace is excluded from new orchestration work
- [x] Behavior for active tasks/workers is explicit
- [x] Runtime state preservation rules are documented
