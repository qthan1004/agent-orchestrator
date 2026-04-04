# End-to-End Full Flow Test

- **Phase**: D — Full Flow Test
- **Goal**: Chứng minh orchestrator hoạt động từ plan → decompose → execute → done

## Files

| Action | Path |
|--------|------|
| NEW | `plan/test_hello-orchestrator_v0.1.md` |
| NEW | `plan/orchestrator_poc-results_v0.1.md` |
| NEW | `tests/e2e-flow.mjs` |

## What to Do

### 1. Viết Test Plan

Tạo `plan/test_hello-orchestrator_v0.1.md` — plan đơn giản 2-3 tasks:

```markdown
# Test Plan: Hello Orchestrator

## Goal
Tạo 1 file `hello.md` trong root project với nội dung "Hello from Orchestrator!"
và update README.md thêm section "Orchestrator Status".

## Tasks
1. Tạo file `hello.md` với content chuẩn
2. Update `README.md` — thêm section Orchestrator Status
3. Verify cả 2 files tồn tại và đúng nội dung
```

### 2. Run Full Flow

**Step 1**: Start server
```bash
node src/index.mjs serve
```

**Step 2**: Load plan
```bash
node src/index.mjs plan load plan/test_hello-orchestrator_v0.1.md
```

**Step 3**: Mở Antigravity session (Claude) → agent tự:
1. Đọc SKILL.md → biết protocol
2. `register_worker()` → nhận worker_id
3. `get_queue_status()` → empty → vào Decomposer mode
4. `get_plan_for_decomposition()` → đọc plan
5. Decompose → `submit_decomposition(tasks, graph)`
6. MCP validate → accepted
7. Switch Worker mode → `get_next_task()` → execute → `complete_task()`
8. Loop cho đến hết

### 3. Verify Checklist

- [x] **File flow**: inbox → active → outbox ✅
  - Check: `ls exchange/inbox/` (empty sau khi all done)
  - Check: `ls exchange/outbox/` (có result files)
- [x] **Result JSON**: outbox/*.result.json đúng format
- [x] **Checkpoint**: exchange/checkpoints/ có snapshot
- [x] **Logs**: exchange/logs/YYYY-MM-DD.md có đầy đủ events
- [x] **Worker registry**: exchange/workers.json có worker info
- [x] **DAG**: Task 3 chỉ run sau khi 1+2 done

### 4. Measure Token Cost

Ghi lại:
- Tokens cho `register_worker()` call
- Tokens cho `get_next_task()` call
- Tokens cho `view_file(task_file)` read
- Tokens cho `complete_task()` call
- **Total coordination overhead per task**
- So sánh với estimate: ~200-300 tokens per task

### 5. Document Results

Tạo `plan/orchestrator_poc-results_v0.1.md`:
- ✅ What worked
- ❌ What failed
- 🟡 Gaps discovered
- 📊 Token cost analysis
- 📋 Next steps (v0.5 plan)

## Constraints

- Test plan phải đơn giản — mục đích verify flow, không test complexity
- Ghi lại MỌI observation — cả positive lẫn negative
- Nếu flow fail ở bất kỳ step → ghi lại chính xác ở đâu, tại sao

## Dependencies

- `14-mcp_recovery-crash-test` phải xong trước (all systems ready)

## Verification

```bash
# After full flow:
ls exchange/outbox/     # Should have result files
cat exchange/logs/$(date +%Y-%m-%d).md  # Should have full event history
cat exchange/checkpoints/  # Should have checkpoint
```

## Done Criteria

- [x] Plan loaded → decomposed → tasks created in inbox/
- [x] Agent executed all tasks successfully
- [x] File flow: inbox → active → outbox verified
- [x] Result JSONs valid
- [x] Checkpoint saved
- [x] Logs complete
- [x] Token cost documented
- [x] POC results written to plan/
