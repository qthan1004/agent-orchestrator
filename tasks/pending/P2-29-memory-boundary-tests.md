# Task P2-29: Memory Boundary Tests

## Info
- **ID:** P2-29-memory-boundary-tests
- **Module:** `tests/`
- **Group:** Post-Core Intelligence
- **Dependencies:** P2-22, P2-26
- **Priority:** 18

## What to do

Add tests proving memory writes stay inside the correct workspace scope by default.

### Must verify

- workspace A does not write into workspace B memory
- case-bank default path is workspace-local
- any global/shared path is separate and explicit

## Done Criteria
- [ ] Workspace memory isolation tested
- [ ] Default case-bank scope tested
- [ ] No silent global write behavior
