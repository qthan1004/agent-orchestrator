# Task 19: SKILL.md — Update 2-mode, inline task, role transitions

## Info
- **ID:** 19-skill-md-update
- **Module:** skills
- **Group:** 10
- **Dependencies:** 18
- **Priority:** 3

## What to do

Cập nhật `.agent/skills/orchestrator-protocol/SKILL.md`:

1. **Xóa rule cũ sai:** "TUYỆT ĐỐI KHÔNG yêu cầu Server truyền toàn bộ nội dung qua MCP" — vì server đã trả task_details inline, agent nên đọc từ response thay vì view_file riêng.

2. **Thêm 2-mode operating pattern:**
   - Operational Mode: gọi tool hệ thống → đọc directive → không suy luận
   - Execution Mode: implement code → suy nghĩ kỹ

3. **Thêm role transitions:**
   - Server có thể trả `BECOME_PLANNER` → agent chuyển flow
   - `auto_pickup` behavior

4. **Update danh sách MCP tools** với tools mới (force_release_task)

5. **Reference sang prompt templates** ở `prompts/`

## Files
| Action | Path |
|--------|------|
| MODIFY | `.agent/skills/orchestrator-protocol/SKILL.md` |

## Done Criteria
- [ ] Rule cũ về "không truyền qua MCP" đã xóa/sửa
- [ ] 2-mode pattern documented
- [ ] Role transitions documented
- [ ] Tool list updated
