---
description: Worker Agent — đọc ticket file và tự thực thi (code, test, move done)
---

# Execute Task (Worker Mode)

Khi user gọi `/execute-task <task-name>`, bạn trở thành **Worker Agent** — chỉ làm đúng theo ticket, **KHÔNG mở rộng scope**.

## Step 1 — Xác định ticket file

`<task-name>` là tên file (không cần extension), ví dụ:
- `01-menu-fix-keyboard-nav`
- `02-menu-cleanup-constants`

Đường dẫn ticket: `plan/tasks/todo/<task-name>.md`

Nếu `<task-name>` không được cung cấp → hỏi user trước khi tiếp tục.

## Step 2 — Đọc skills bắt buộc

// turbo
2a. Đọc Strict Scope skill:
```bash
cat ".agent/skills/strict-scope/SKILL.md"
```

// turbo
2b. Đọc component patterns skill (nếu task liên quan đến React component):
```bash
cat ".agent/skills/component-patterns/SKILL.md"
```

## Step 3 — Đọc ticket

// turbo
3. Đọc toàn bộ nội dung ticket:
```bash
cat "plan/tasks/todo/<task-name>.md"
```

Sau khi đọc xong, xác nhận với user:
- **Goal** của ticket là gì
- **Files** sẽ được sửa/tạo/xóa
- **Dependencies** — ticket nào cần hoàn thành trước

Nếu dependency chưa done → **DỪNG** và báo user ngay.

## Step 4 — Đọc skills bổ sung trong ticket

Ticket sẽ liệt kê skills cần đọc trong section `## Constraints`. Đọc tất cả skills đó trước khi code.

## Step 5 — Implement

Thực hiện đúng theo section `## What to Do` trong ticket:
- Chỉ sửa các file trong danh sách `## Files`
- Không thêm feature/refactor ngoài scope
- Không sửa file không có trong danh sách

## Step 6 — Verify

// turbo
6. Chạy lệnh verification trong section `## Verification` của ticket:
```bash
# Lệnh sẽ được lấy từ ticket
```

Nếu tests FAIL → debug và fix trước khi tiếp tục.

## Step 7 — Move ticket sang done

// turbo
7. Sau khi tất cả Done Criteria đạt:
```bash
mv "plan/tasks/todo/<task-name>.md" \
   "plan/tasks/done/<task-name>.md"
```

## Step 8 — Báo kết quả

Báo user:
- ✅ Những gì đã làm (tóm tắt theo Done Criteria)
- 📋 Test output (pass/fail)
- 📁 File đã move sang `plan/tasks/done/`

---

## Khi gặp blocker

Nếu KHÔNG thể hoàn thành (spec không rõ, thiếu dependency, file không tồn tại):

// turbo
```bash
mkdir -p "plan/tasks/blocked"
mv "plan/tasks/todo/<task-name>.md" \
   "plan/tasks/blocked/<task-name>.md"
```

Thêm section vào cuối ticket:
```markdown
## Blocker
[Mô tả lý do không thể tiếp tục]
```

Báo user để Planner review lại.
