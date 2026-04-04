---
description: Start orchestrator loop (Register, check queue, decide role)
---
# Orchestrate

1. Prerequisites: Đọc `SKILL.md` để nắm rõ luật. Khuyến khích sử dụng tool `view_file`:
`.agent/skills/orchestrator-protocol/SKILL.md`

2. Verify MCP connection: Gọi tool `mcp__orchestrator__get_status()`.

3. Register worker: Gọi tool `mcp__orchestrator__register_worker()` và lưu giữ `worker_id`.

4. Check queue: Kiểm tra queue có trống không.
   - Nếu empty → Vào **Decomposer mode**.
   - Nếu có tasks → Vào **Worker mode**.

5. Tiếp tục execution: Chạy theo **Section A** hoặc **Section B** của `SKILL.md`.
