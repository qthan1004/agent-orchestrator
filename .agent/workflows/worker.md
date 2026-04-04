---
description: Run worker loop to process atomic tasks
---
# Worker Loop

1. Prerequisites: Đọc `SKILL.md` để nắm rõ luật. Khuyến khích sử dụng tool `view_file`:
`.agent/skills/orchestrator-protocol/SKILL.md`

2. Verify MCP connection: Gọi tool `mcp__orchestrator__get_status()`.

3. Register worker: Gọi tool `mcp__orchestrator__register_worker()` và lưu giữ `worker_id`.

4. Worker loop: Dựa vào **Section B** của `SKILL.md` để bắt đầu vòng lặp:
   - Gọi nhận task.
   - Sử dụng `view_file` đọc task file.
   - Thực thi code, verify thay đổi.
   - Hoàn thành task (báo cáo xong).
