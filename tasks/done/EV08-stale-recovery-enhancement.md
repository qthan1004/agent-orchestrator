# Task EV08: MCP Stale Recovery Enhancement

## Info
- **ID:** EV08-stale-recovery-enhancement
- **Module:** src/mcp-server/state-manager.mjs
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV07
- **Priority:** 8
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 2, §2.3

## What to do

Enhance state-manager để tự ghi recovery signal khi phát hiện worker stale.

### [MODIFY] `src/mcp-server/state-manager.ts`

**Thêm logic vào auto-kill/stale detection:**

```
Khi worker stale > 3 phút (STALE_THRESHOLD_MS):
  1. Write exchange/signals/recovery-needed.json
     {
       "worker_id": "<string>",
       "last_task": "<task_id or null>",
       "stale_since": "<ISO timestamp>",
       "resume_hint": "check .agent/session.json",
       "created_at": "<ISO timestamp>"
     }
  2. Log recovery signal event
  3. Agent mới khi start → check exchange/signals/ → pickup nếu có
```

### [NEW] `exchange/signals/` directory

Tạo directory nếu chưa tồn tại (bootstrap).

> **Lưu ý:** Signal files là ephemeral — agent đọc xong có thể xóa.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/state-manager.ts` |
| MODIFY | `src/utils/bootstrap.ts` — thêm `exchange/signals` vào bootstrap dirs |

## Verification
```bash
# Simulate stale worker (register, không heartbeat, đợi 3 phút)
# → Verify exchange/signals/recovery-needed.json xuất hiện
# → Verify log entry "Recovery signal written"
```

## Done Criteria
- [x] `exchange/signals/` directory tồn tại sau bootstrap
- [x] Recovery signal file written khi worker stale > threshold
- [x] Signal file chứa đúng fields
- [x] Không ảnh hưởng logic stale detection hiện tại
