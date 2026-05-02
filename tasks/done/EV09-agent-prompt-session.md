# Task EV09: Agent Prompt — Session Protocol Update

## Info
- **ID:** EV09-agent-prompt-session
- **Module:** prompts/
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV06, EV07
- **Priority:** 9
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 2, §2.4

## What to do

Cập nhật agent prompt template để thêm Session Protocol instructions. Agent cần biết workflow mới: check session → read memory → checkpoint → clear.

### [MODIFY] `prompts/agent-prompt.md` (hoặc file tương đương)

**Thêm section mới:**

```markdown
## Session Protocol
1. Start: check `.agent/session.json` → resume if exists
2. Start: read `.agent/workspace-memory.md` → skip deep discovery
3. Working: call `session_checkpoint(save)` after each major action
4. Done: call `session_checkpoint(clear)`
5. Error: call `report_error`, do NOT retry blindly
```

> **Lưu ý:** Đặt section này ở vị trí nổi bật (đầu file hoặc ngay sau Project Context) để agent đọc đầu tiên.

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` (hoặc file tương đương) |

## Verification
- [ ] Agent prompt chứa Session Protocol section
- [ ] Mở conversation mới → agent tự check session.json

## Done Criteria
- [x] Session Protocol section có trong prompt
- [x] 5 steps đầy đủ
