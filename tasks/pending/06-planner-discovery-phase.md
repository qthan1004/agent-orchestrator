# Task 06: Planner Auto-Discovery Phase

## Vấn đề
Do các kiến thức và config riêng của workspace không được tìm và include trong các tasks, Worker không biết dùng convention/project rule nào.

## Actions
1. **[MODIFY] `prompts/agent-prompt.md`**
   - Cập nhật Step 3 của Section P (Mode B) của Planner.
   - Bắt buộc Agent thực hiện DISCOVERY (bằng cách dùng tool xem `.agent/context.md`, `list_dir` trong `.agent/skills/` và `tools/` của workspace_root) TRƯỚC KHI sinh ra các sub-tasks.
   - Decompose: Map dính các rules/scripts tương ứng vào `what_to_do` và `constraints` cho từng task sinh ra.
