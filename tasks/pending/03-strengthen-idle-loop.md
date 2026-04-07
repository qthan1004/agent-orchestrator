# Task 03: Strengthen Idle Loop for Workers

## Vấn đề
Worker end chat khi nhận IDLE thay vì polling liên tục vì prompt hiện tại yếu (chỉ bảo "wait briefly").

## Actions
1. **[MODIFY] `prompts/agent-prompt.md`**
   - Strengthen **Section I (Idle Protocol)**.
   - Thêm instruction **DO NOT end the conversation**. MUST stay alive and keep polling.
   - Gọi `get_next_task(worker_id)` ngay lập tức, server sẽ lo việc long-polling.
   - Thêm cảnh báo CRITICAL: NEVER end chat session trừ khi user yêu cầu `stop` hoặc `exit`.
