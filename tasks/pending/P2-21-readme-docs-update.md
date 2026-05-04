# Task P2-21: README + Docs Update

## Info
- **ID:** P2-21-readme-docs-update
- **Module:** `README.md`, `dev-docs/`
- **Group:** Sprint 4 (Polish + E2E)
- **Dependencies:** P2-20
- **Priority:** 15
- **Ref:** All Phase 2 docs

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Update README and documentation to reflect new architecture.

### README changes:
- Architecture diagram: 3-tier (source / runtime / workspace) + HYBRID mode
- Ollama setup: install, pull model, verify
- New startup flow: profile selection
- Updated directory structure (no more `exchange/` in source root)
- HYBRID mode usage guide

### Dev docs:
- Move `plan_phase2-hybrid-architecture.md` → `dev-docs/done/`
- Move `2026-05-04_research_exchange-placement-3tier-architecture.md` → `dev-docs/done/`

### Task board:
- Update `tasks/README.md` counts + P2 section status

## Files
| Action | Path |
|--------|------|
| MODIFY | `README.md` |
| MOVE | `dev-docs/plan_phase2-hybrid-architecture.md` → `dev-docs/done/` |
| MOVE | `dev-docs/2026-05-04_research_*.md` → `dev-docs/done/` |
| MODIFY | `tasks/README.md` |

## Done Criteria
- [ ] README shows 3-tier + HYBRID architecture
- [ ] Ollama setup instructions present
- [ ] Directory structure updated
- [ ] Completed plans moved to `done/`
- [ ] Task board counts updated
