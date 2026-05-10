# Task P2-24: Workspace Reconnect Policy

## Info
- **ID:** P2-24-workspace-reconnect-policy
- **Module:** `src/mcp-server/`, `src/utils/workspace-registry.ts`, docs/runtime policy
- **Group:** Architecture Core
- **Dependencies:** P2-20, P2-21, P2-23
- **Priority:** 5
- **Ref:** Workspace lifecycle continuity

## What to do

Define whether the server should support reconnecting a previously closed workspace, and if yes, how that flow works safely.

### Questions to resolve

- Is reconnect a separate operation from fresh import?
- Does reconnect reuse the old `workspace_id` if path is unchanged?
- What state is resumed: plans, queue, checkpoints, workers, memory?
- What happens if the underlying path no longer exists or has changed materially?

### Recommended direction

- support reconnect, but as a controlled `re-open` of a previously registered workspace
- reuse `workspace_id` only when canonical path matches exactly
- re-validate path existence and runtime compatibility before reactivation
- never auto-reconnect silently during unrelated operations

### Rules

- Reconnect must be explicit, not magical
- Reconnect must preserve workspace identity guarantees
- Reconnect must fail clearly on missing or moved paths

## Done Criteria
- [ ] Reconnect vs fresh import policy is defined
- [ ] Identity reuse rules are explicit
- [ ] Failure handling for missing/moved paths is explicit
- [ ] Recommendation is documented in canonical workspace lifecycle flow
