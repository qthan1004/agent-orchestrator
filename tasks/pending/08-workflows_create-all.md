# Create Agent Workflows

- **Phase**: B — Skills / Workflows / Templates
- **Goal**: Tạo 5 workflows cho Antigravity slash commands

## Files

| Action | Path |
|--------|------|
| NEW | `.agent/workflows/start-server.md` |
| NEW | `.agent/workflows/orchestrate.md` |
| NEW | `.agent/workflows/worker.md` |
| NEW | `.agent/workflows/decompose-plan.md` |
| NEW | `.agent/workflows/status.md` |

## What to Do

### 1. `start-server.md` — `/start-server`
- Step 1: Health check (`curl http://localhost:3847/health`) — turbo
- Step 2: Start server nếu NOT_RUNNING (`node src/index.mjs serve &`)
- Step 3: Wait + verify — turbo

### 2. `orchestrate.md` — `/orchestrate`
- Prerequisites: đọc SKILL.md — turbo
- Step 1: Verify MCP connection (`mcp__orchestrator__get_status()`)
- Step 2: Register worker
- Step 3: Check queue → nếu empty, vào Decomposer mode
- Step 4: Nếu có tasks → vào Worker mode
- Step 5: Chạy theo Section A hoặc B của SKILL.md

### 3. `worker.md` — `/worker`
- Prerequisites: đọc SKILL.md — turbo
- Step 1: Verify MCP connection
- Step 2: Register worker
- Step 3: Worker loop (Section B của SKILL.md)

### 4. `decompose-plan.md` — `/decompose`
- Prerequisites: đọc SKILL.md — turbo
- Step 1: Verify MCP connection
- Step 2: Gọi `get_plan_for_decomposition()`
- Step 3: Đọc plan file (`view_file`)
- Step 4: Decompose → `submit_decomposition()`

### 5. `status.md` — `/status`
- Step 1: Gọi `mcp__orchestrator__get_queue_status()` — turbo
- Step 2: Hiển thị bảng status cho user

Tham khảo: `reference/workflows/` (evolve từ các file hiện có)

## Constraints

- Mỗi workflow có YAML frontmatter: `description`
- Dùng `// turbo` annotation cho steps an toàn
- Dùng `// turbo-all` cho workflows hoàn toàn safe (vd: status)
- Viết rõ ràng, agent đọc là biết phải làm gì

## Dependencies

- `07-skills_orchestrator-protocol` phải xong trước

## Verification

```bash
ls .agent/workflows/
```

Verify: 5 files tồn tại, mỗi file có YAML frontmatter hợp lệ.

## Done Criteria

- [ ] 5 workflow files tồn tại
- [ ] Mỗi file có `description` trong YAML frontmatter
- [ ] Logic flow nhất quán với SKILL.md
- [ ] `// turbo` annotations ở đúng steps
