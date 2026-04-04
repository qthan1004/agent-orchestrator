---
name: dev-task-protocol
description: Protocol để agent thực thi tasks từ tasks/ directory — pick, execute, complete
---
# Dev Task Protocol

> Tạm dùng. Remove sau khi build xong.

## Board: `tasks/{pending,processing,done}/`

## Flow: Pick → Execute → Complete

### Pick
1. `node tools/check-deps.mjs` → view `tasks/.tmp/deps-check.md`
2. Chọn task ✅ READY số nhỏ nhất
3. `Move-Item tasks/pending/XX-xxx.md tasks/processing/`

### Execute
1. Đọc task file → làm theo **What to Do**
2. Chỉ sửa files trong **Files** table
3. Tuân thủ **Constraints**

### Complete
1. Chạy **Verification** → check **Done Criteria** `[x]`
2. `Move-Item tasks/processing/XX-xxx.md tasks/done/`
3. Update `tasks/README.md` status
4. `git add tasks; git commit -m "feat(orchestrator): complete task XX — <title>"`

## Rules
- ❌ Không skip verification, không làm 2 task cùng lúc, không sửa ngoài scope
- ✅ Đọc `code-consistency` skill trước khi viết code
- ✅ Chạy `node tools/code-index.mjs` → view `tasks/.tmp/code-index.md` trước khi code
