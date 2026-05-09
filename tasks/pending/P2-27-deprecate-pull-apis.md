# Task P2-27: Deprecate Pull APIs

## Info
- **ID:** P2-27-deprecate-pull-apis
- **Module:** docs, tests, API surface
- **Group:** Architecture Core
- **Dependencies:** P2-25, P2-28
- **Priority:** 11

## What to do

Mark legacy pull-model APIs as deprecated and remove them from canonical flow.

### Target concepts

- `get_next_task`
- auto-pickup semantics
- worker-driven task claiming

### Rules

- If temporarily retained, they must be labeled compatibility-only
- They must not appear in primary docs, E2E, or architecture diagrams

## Done Criteria
- [ ] Pull APIs marked deprecated or quarantined
- [ ] Canonical docs no longer use them
- [ ] Canonical tests no longer depend on them
