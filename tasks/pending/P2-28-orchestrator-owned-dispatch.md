# Task P2-28: Orchestrator-Owned Dispatch

## Info
- **ID:** P2-28-orchestrator-owned-dispatch
- **Module:** `src/worker/dispatch-loop.ts`, `src/mcp-server/`
- **Group:** Architecture Core
- **Dependencies:** P2-25, P2-26, P2-30
- **Priority:** 11

## What to do

Refactor HYBRID dispatch semantics so the Orchestrator assigns work to workers explicitly.

### Rules

- Dispatch decisions happen in Orchestrator
- Worker only receives assigned payload and executes
- Workspace scope is attached before execution
- Capacity and routing stay orchestrator-owned

## Done Criteria
- [ ] Dispatch loop uses assignment semantics
- [ ] Worker does not self-select tasks
- [ ] Workspace-scoped payload is included
- [ ] Hybrid mode matches canonical architecture
