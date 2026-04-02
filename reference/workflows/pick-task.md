---
description: List các task còn tồn (todo/blocked) → chọn số → tự execute task đó
---

# Pick Task (Interactive)

Khi user gọi `/pick-task`, bạn sẽ liệt kê tất cả tasks đang pending, để user chọn bằng số, rồi tự execute.

## Step 1 — Scan task folders

Đọc danh sách file trong 3 thư mục:
- `plan/tasks/todo/` → trạng thái **📋 TODO**
- `plan/tasks/blocked/` → trạng thái **🚫 BLOCKED**
- `plan/tasks/done/` → trạng thái **✅ DONE**

## Step 2 — Hiển thị danh sách

Hiển thị bảng task cho user theo format sau. **Chỉ đánh số** các task `TODO` (vì chỉ TODO mới executable):

```
## 📋 Danh sách Tasks

### TODO (chọn số để execute)
| #  | Task                            | File                              |
|----|---------------------------------|-----------------------------------|
| 1  | Fix keyboard navigation         | 01-menu-fix-keyboard-nav.md       |
| 2  | Cleanup constants               | 02-menu-cleanup-constants.md      |

### BLOCKED
| Task                            | File                              |
|---------------------------------|-----------------------------------|
| (none)                          |                                   |

### DONE ✅
> X task(s) completed.

---
👉 Nhập **số** để execute task, hoặc `0` để thoát.
```

**Cách lấy tên task cho cột "Task":**
- Đọc dòng `# ...` đầu tiên trong file ticket (header markdown)
- Nếu không có header → dùng filename (bỏ extension và prefix số)

## Step 3 — Chờ user chọn

Chờ user nhập một số. Validate:
- Nếu `0` → kết thúc, không làm gì thêm
- Nếu số nằm ngoài range → báo lỗi, hiện lại danh sách
- Nếu hợp lệ → sang Step 4

## Step 4 — Execute task đã chọn

Khi user chọn số hợp lệ:

1. Lấy `<task-name>` từ filename (bỏ `.md`), ví dụ: `01-menu-fix-keyboard-nav`
2. **Chạy workflow `/execute-task`** với task đó — nghĩa là thực hiện đầy đủ các step trong file `.agent/workflows/execute-task.md`, bắt đầu từ Step 2 (đọc skills), vì bạn đã biết task-name rồi.

---

## Lưu ý

- Nếu folder `plan/tasks/todo/` rỗng → thông báo "🎉 Không còn task nào! Tất cả đã hoàn thành." và dừng.
- Nếu folder `plan/tasks/` không tồn tại → thông báo lỗi và dừng.
- Bỏ qua file `.gitkeep` khi scan.
