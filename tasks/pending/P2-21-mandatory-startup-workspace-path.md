# Task P2-21: Mandatory Startup Workspace Path

## Info
- **ID:** P2-21-mandatory-startup-workspace-path
- **Module:** `src/utils/startup-prompt.ts`, `src/config.ts`, `src/mcp-server/`
- **Group:** Architecture Core
- **Dependencies:** P2-20
- **Priority:** 2
- **Ref:** Workspace-first server bootstrap

## What to do

Make workspace import mandatory at server startup so every orchestration session begins with an explicit primary workspace.

### Required behavior

- startup cannot proceed without a non-empty `workspace_path`
- defaulting silently to `process.cwd()` is no longer canonical behavior
- startup must register the primary workspace immediately
- primary workspace bootstrap must create workspace-scoped runtime directories before watchers and dispatch start
- startup output must clearly show `workspace_id`, path, and role as primary workspace

### Rules

- No implicit workspace inference at startup
- Startup validation errors must be explicit and actionable
- Primary workspace registration must use the same registry contract as later workspace imports

## Done Criteria
- [ ] Startup rejects empty or missing workspace path
- [ ] Primary workspace is registered before server services start
- [ ] Workspace-scoped runtime bootstrap happens during startup
- [ ] Startup UX clearly confirms the imported primary workspace
