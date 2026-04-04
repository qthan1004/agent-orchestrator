# Create Orchestrator Protocol SKILL.md

- **Phase**: B — Skills / Workflows / Templates
- **Goal**: Tạo SKILL.md dùng cho agents biết cách tương tác với MCP Orchestrator

## Files

| Action | Path |
|--------|------|
| NEW | `.agent/skills/orchestrator-protocol/SKILL.md` |

## What to Do

Tạo `.agent/skills/orchestrator-protocol/SKILL.md` với nội dung đầy đủ:

1. **Header YAML**: name, description
2. **Section 1 — Kết nối**: Gọi `register_worker()` → nhận worker_id
3. **Section 2 — Xác định vai trò**:
   - Queue chưa có tasks → Decomposer Role
   - Queue đã có tasks → Worker Role
4. **Section A — Decomposer Role**:
   - `get_plan_for_decomposition()` → đọc plan file
   - Phân tích → chia atomic tasks
   - Constraints: max 20 tasks, required fields
   - `submit_decomposition(tasks, graph, reasoning)`
   - Handle rejection → fix → resubmit
5. **Section B — Worker Role (Loop)**:
   - `get_next_task(worker_id)` → nhận task_id + file_path
   - `view_file(file_path)` — đọc task details (token-efficient!)
   - Implement theo `what_to_do`
   - Chạy `verification` command
   - `complete_task(task_id, status, summary, worker_id)`
   - Loop lại
6. **Blocker handling**: `complete_task(task_id, "blocked", reason)`
7. **Rules**: ❌ KHÔNG sửa ngoài scope, ❌ KHÔNG tạo task mới, ✅ report_progress

Tham khảo: `reference/skills/task-delegation/SKILL.md` (evolve từ đây)

## Constraints

- Skill phải self-contained — agent đọc 1 file là đủ hiểu protocol
- Viết bằng tiếng Việt (consistent với codebase)
- Rõ ràng từng step, không mơ hồ

## Dependencies

- `06-mcp_multi-session-hardening` phải xong trước (MCP tools đã tồn tại)

## Verification

```bash
cat ".agent/skills/orchestrator-protocol/SKILL.md"
```

Đọc lại → verify logic flow hợp lý, không thiếu step.

## Done Criteria

- [ ] File tồn tại tại `.agent/skills/orchestrator-protocol/SKILL.md`
- [ ] Có YAML frontmatter (name, description)
- [ ] Cover cả Decomposer + Worker roles
- [ ] References đúng MCP tool names (mcp__orchestrator__xxx)
- [ ] Token-efficient: dùng `view_file()` thay vì request full data qua MCP
