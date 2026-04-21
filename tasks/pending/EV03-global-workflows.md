# Task EV03: Create Global Workflows

## Info
- **ID:** EV03-global-workflows
- **Module:** AG global config
- **Group:** 1 (AG Ecosystem Setup)
- **Dependencies:** none
- **Priority:** 3
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 1, §1.3

## What to do

Tạo `global_workflows/` trong AG data directory. Workflows ở đây available cho MỌI workspace.

### AG Data Dir paths

```
Windows: %USERPROFILE%\.gemini\antigravity\global_workflows\
Linux:   ~/.gemini/antigravity/global_workflows/
```

### [NEW] `global_workflows/resume-session.md`

```markdown
---
name: Resume Session
description: Resume công việc từ session trước bị gián đoạn
---

1. Đọc file `.agent/session.json` nếu tồn tại
2. Đọc file `.agent/workspace-memory.md` nếu tồn tại  
3. Tiếp tục task từ checkpoint đã ghi
4. Nếu không có session.json → thông báo "No previous session found"
```

## Files
| Action | Path |
|--------|------|
| NEW    | `<AG_DATA_DIR>/global_workflows/resume-session.md` |

## Verification
- [ ] Thư mục global_workflows tồn tại
- [ ] File resume-session.md có YAML frontmatter hợp lệ   
- [ ] Gõ `/resume-session` trong AG conversation → workflow xuất hiện

## Done Criteria
- [ ] `resume-session.md` tồn tại tại đúng path
- [ ] Workflow hoạt động khi gọi `/resume-session`
