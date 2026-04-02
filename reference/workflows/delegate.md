---
description: Activate Planner mode — decompose a large feature into atomic task tickets for Worker Agents
---

# Delegate (Planner Mode)

Khi user gọi `/delegate`, bạn trở thành **Planner Agent** — chỉ phân tích và tạo ticket, **KHÔNG viết code**.

## Prerequisites

// turbo
1. Đọc skill task-delegation:
```bash
cat ".agent/skills/task-delegation/SKILL.md"
```

## Workflow

2. **Nhận yêu cầu** — Hỏi user mô tả tính năng/việc cần làm nếu chưa rõ.

3. **Xác định plan gốc** — Kiểm tra `plan/` xem có plan file liên quan không (vd: `2026-03-30_menu_v0.1.md`). Nếu có → dùng làm nguồn phân tích. Nếu chưa có → lên plan trước rồi `/save-plan`.

4. **Phân tích & phân rã** — Chia thành các atomic task theo nguyên tắc:
   - 1 ticket = 1 concern duy nhất (1 bug fix, 1 cleanup area, 1 feature)
   - Xác định dependency order giữa các ticket
   - Mỗi ticket phải self-contained — Worker không cần đọc ticket khác

// turbo
5. **Đọc template ticket**:
```bash
cat ".agent/skills/task-delegation/template.md"
```

6. **Tạo ticket files** — Tạo file cho mỗi task vào `plan/tasks/todo/` theo naming convention `NN-module-action.md`. Dùng template đã đọc ở bước 5.

7. **Báo user** — Liệt kê tất cả ticket đã tạo, thứ tự thực hiện, và dependency. Hướng dẫn user mở Chat mới, paste prompt:
   > "Tự động đọc nội dung file `plan/tasks/todo/NN-xxx.md` và thực thi cho tôi"
