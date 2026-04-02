---
name: Task Delegation & Micro-Agents
description: Protocol for Planner Agent to break down large jobs into atomic ticket files for Worker Agents in separate conversations.
---

# Task Delegation Protocol

Khi xử lý feature lớn, **KHÔNG** code trực tiếp từ A-Z trong 1 conversation. Thay vào đó, chia thành Planner + Worker.

## Workflow Trigger

User gọi `/delegate` → Agent đọc workflow này rồi thực thi.

---

## 1. Planner Agent Protocol

Planner **CHỈ** phân tích và tạo ticket. **KHÔNG viết code.**

### Naming Convention

```
plan/tasks/todo/NN-module-action.md
```

- `NN` = số thứ tự 2 chữ số (01, 02, 03...), thể hiện **dependency order**
- `module` = tên lib/module (lowercase), vd: `menu`, `dialog`, `theme`
- `action` = hành động cụ thể (lowercase, dùng dấu gạch ngang), vd: `fix-keyboard`, `cleanup-constants`, `add-dense-mode`

### Ví dụ

```
plan/tasks/todo/
├── 01-menu-fix-keyboard-nav.md
├── 02-menu-cleanup-constants.md
├── 03-menu-cleanup-helpers.md
├── 04-menu-remove-dropdown-refs.md
└── 05-menu-style-polish.md
```

### Nguyên tắc phân rã

| Quy tắc | Giải thích |
|---------|-----------|
| **1 ticket = 1 concern** | Mỗi ticket chỉ xử lý 1 việc: 1 bug fix, 1 cleanup area, hoặc 1 feature nhỏ |
| **Self-contained** | Worker đọc ticket + skills là đủ code, không cần đọc ticket khác |
| **Dependency order** | Ticket NN phải xong trước khi NN+1 bắt đầu (nếu có dependency) |
| **Có plan gốc** | Bắt buộc có plan file trong `plan/` trước khi tạo ticket (dùng `/save-plan`) |
| **Files cụ thể** | Liệt kê absolute path đến từng file cần sửa/tạo |
| **Verification rõ ràng** | Mỗi ticket phải có lệnh test/build cụ thể để Worker verify |

### Ticket Format

Dùng template tại `.agent/skills/task-delegation/template.md`.

---

## 2. Worker Agent Protocol

Worker được khởi động trong **Chat mới hoàn toàn**. User paste prompt:

> "Tự động đọc nội dung file `plan/tasks/todo/NN-xxx.md` và thực thi cho tôi"

### Worker phải làm:

1. **Đọc ticket** — `cat plan/tasks/todo/NN-xxx.md`
2. **Đọc skills liên quan** — Ticket sẽ liệt kê skills nào cần đọc
3. **Code** — Implement đúng theo ticket, không mở rộng scope
4. **Test** — Chạy lệnh verification ghi trong ticket
5. **Move done** — `mv plan/tasks/todo/NN-xxx.md plan/tasks/done/NN-xxx.md`
6. **Báo user** — Thông báo kết quả, kèm output test

### Worker KHÔNG được làm:

- ❌ Tự ý thêm feature/refactor ngoài phạm vi ticket
- ❌ Sửa file không nằm trong danh sách ticket
- ❌ Tạo ticket mới
- ❌ Đọc hoặc sửa ticket khác

### Khi gặp blocker:

Nếu Worker không thể hoàn thành (ví dụ: thiếu dependency, spec không rõ):
1. Move ticket sang `plan/tasks/blocked/` thay vì `done/`
2. Ghi lý do blocker vào cuối ticket dưới section `## Blocker`
3. Báo user để Planner review lại

---

## 3. Directory Structure

```
plan/tasks/
├── todo/      ← Ticket chờ xử lý
├── done/      ← Ticket đã hoàn thành
└── blocked/   ← Ticket bị chặn, cần review
```

---

## 4. Lifecycle

```
User request → /delegate → Planner tạo tickets
                                ↓
               User mở Chat mới → Worker nhận ticket 01
                                ↓
               Worker code + test → move 01 → done/
                                ↓
               User mở Chat mới → Worker nhận ticket 02
                                ↓
               ... lặp lại đến hết tickets ...
```
