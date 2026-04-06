---
description: Pick task nhỏ nhất (FIFO) từ tasks/pending, chuyển vào processing, thực thi, rồi chuyển vào done.
---

# Pick Task (FIFO)

Quy trình bốc 1 task từ `tasks/pending/`, thực thi, và hoàn thành.

> **Cross-platform:** Dùng Node.js scripts trong `tools/`, chạy được trên cả Linux và Windows.

## Các bước

### 1. Pick task FIFO từ pending → processing
// turbo
```bash
node tools/pick-task.mjs
```
→ Script tự quét `tasks/pending/`, pick file có số nhỏ nhất, move vào `tasks/processing/`.
→ Output JSON: `{ picked: "<filename>", path: "tasks/processing/<filename>" }`
→ Nếu `picked: null` → dừng, báo "Không có task pending."
→ Nếu `error` (đang có task processing) → đọc task đang processing đó, tiếp tục từ bước 2.

### 2. Đọc nội dung task

Dùng `view_file` để đọc file tại `path` trả về từ bước 1.

Chú ý các section quan trọng:
- **What to do** — Nội dung cần thực thi
- **Files** — Các file cần tạo/sửa
- **Verification** — Lệnh kiểm tra sau khi xong
- **Done Criteria** — Checklist hoàn thành

### 3. Thực thi task

Thực hiện đúng theo mục **What to do** trong file task:
- Tạo/sửa các file được liệt kê trong mục **Files**
- Tuân thủ đúng scope — KHÔNG làm thêm gì ngoài yêu cầu (ref: skill `strict-scope`)

### 4. Verification — Kiểm tra kết quả

Chạy các lệnh verification được ghi trong task file.
- Nếu **PASS** → tiếp bước 5
- Nếu **FAIL** → quay lại bước 3, debug và fix

### 5. Đánh dấu Done Criteria

Review checklist **Done Criteria** trong file task. Tick `[x]` cho từng item đã hoàn thành.

### 6. Complete task — chuyển vào done
// turbo
```bash
node tools/complete-task.mjs
```
→ Script tự move file từ `tasks/processing/` vào `tasks/done/`.

### 7. Báo cáo

In ra summary ngắn gọn:
```
✅ Task <filename> hoàn thành.
- Files changed: <danh sách file đã sửa>
- Verification: PASSED
```

> **Lưu ý:** Nếu muốn tiếp tục pick task tiếp theo, chạy lại `/pick-task`.
