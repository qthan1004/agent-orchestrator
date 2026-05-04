# Task P2-04: PlanWatcher Multi-Workspace + Result Sync

## Info
- **ID:** P2-04-planwatcher-multiworkspace
- **Module:** `src/mcp-server/plan-watcher.ts`, `src/mcp-server/tools.ts`
- **Group:** Sprint 0 (3-Tier Infrastructure)
- **Dependencies:** P2-02, P2-03
- **Priority:** 5
- **Ref:** `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

PlanWatcher quét registered workspaces. complete_task ghi results ngược workspace.

### Key changes:

1. **`src/mcp-server/plan-watcher.ts`**:
   - Inject `WorkspaceRegistry` dependency
   - `_poll()` quét TẤT CẢ registered workspaces: `workspace/.agent/plans/pending/`
   - Khi phát hiện plan → copy nội dung vào `~/.orchestrator/workspaces/<id>/plans/processing/`
   - Move plan gốc sang `workspace/.agent/plans/processing/` (tạo dir nếu chưa có)
   - Backward compat: nếu không có workspace registered → quét `root/plan/pending/` như cũ

2. **`src/mcp-server/tools.ts`** (complete_task):
   - Sau khi ghi result vào outbox → sync result file ngược workspace
   - Ghi `workspace/.agent/results/result-<task_id>.json`
   - Result file chứa: `{ task_id, status, summary, completed_at }` (không chứa worker_id)
   - Nếu workspace path không accessible → log warning, không fail

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/plan-watcher.ts` |
| MODIFY | `src/mcp-server/tools.ts` |

## Verification
```bash
npm run build
# Tạo plan ở workspace/.agent/plans/pending/ → PlanWatcher phát hiện
# → decompose → task result ghi về workspace/.agent/results/
```

## Done Criteria
- [ ] PlanWatcher quét registered workspace paths
- [ ] Plan copy → runtime `plans/processing/`
- [ ] Workspace plan gốc move sang `.agent/plans/processing/`
- [ ] `complete_task` ghi `result-*.json` về `workspace/.agent/results/`
- [ ] Backward compat: không có workspace → cũ vẫn chạy
