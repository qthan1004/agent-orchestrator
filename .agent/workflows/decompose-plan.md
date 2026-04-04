---
description: Decompose plan into atomic tasks and submit
---
# Decompose Plan

1. Prerequisites: Đọc `SKILL.md` để nắm rõ luật. Khuyến khích sử dụng tool `view_file`:
`.agent/skills/orchestrator-protocol/SKILL.md`

2. Verify MCP connection: Gọi tool `mcp__orchestrator__get_status()`.

3. Gọi lấy Plan: Dùng `mcp__orchestrator__get_plan_for_decomposition()` để lấy filepath của plan.

4. Đọc plan file: Khuyến khích sử dụng tool `view_file` để phân tích chi tiết.

5. Decompose (Bẻ nhỏ): Thiết kế các atomic tasks theo cấu trúc yêu cầu và nộp lên thông qua `mcp__orchestrator__submit_decomposition()`.
