# Task P2-22: Worker Registration Validation

## Info
- **ID:** P2-22-worker-registration-validation
- **Module:** `src/mcp-server/tools.ts`, `src/models/`
- **Group:** Architecture Core
- **Dependencies:** P2-20
- **Priority:** 3

## What to do

Enforce worker registration rules required by the Phase 2 architecture.

### Required validation

- `workspace_path` is mandatory
- path must be explicit, not inferred
- invalid or empty path is rejected
- worker cannot register without workspace scope

## Done Criteria
- [ ] Registration rejects missing `workspace_path`
- [ ] Validation errors are explicit
- [ ] Worker registration is aligned with workspace-scoped architecture
