# Task P2-01: Runtime Directory Bootstrap

## Info
- **ID:** P2-01-runtime-directory-bootstrap
- **Module:** `src/utils/bootstrap.ts`
- **Group:** Sprint 0 (3-Tier Infrastructure)
- **Dependencies:** P2-00
- **Priority:** 2
- **Ref:** `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Extend `bootstrapDirectories()` để tạo `~/.orchestrator/` structure (logs/, workspaces/). Thêm `bootstrapWorkspace(workspaceId)` tạo per-workspace dirs.

### Key changes:

1. **`bootstrapDirectories(config)`**: Tạo global runtime dirs (`~/.orchestrator/`, `logs/`).
2. **`bootstrapWorkspace(runtimeRoot, workspaceId)`**: Tạo per-workspace structure:
   ```
   ~/.orchestrator/workspaces/<workspaceId>/
   ├── pipeline/
   │   ├── inbox/
   │   ├── active/
   │   └── outbox/
   ├── queue.json
   ├── checkpoints/
   └── plans/
       ├── processing/
       └── done/
   ```
3. Idempotent — gọi lại không lỗi, không overwrite existing data.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/utils/bootstrap.ts` |

## Verification
```bash
npm run build
# Unit test: gọi bootstrap → dirs tồn tại
```

## Done Criteria
- [x] `~/.orchestrator/` tạo được với đủ subdirs
- [x] `bootstrapWorkspace('abc123')` tạo `~/.orchestrator/workspaces/abc123/pipeline/{inbox,active,outbox}`
- [x] Idempotent — gọi lại không lỗi
- [x] `npm run build` pass
