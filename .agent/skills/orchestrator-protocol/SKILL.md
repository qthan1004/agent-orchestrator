---
name: Orchestrator Protocol
description: Giao thức cốt lõi cho các Agent (Decomposer và Worker) khi tương tác với MCP Orchestrator Server.
---

# Orchestrator Protocol

Tài liệu này định nghĩa giao thức chuẩn cho bất kỳ Agent nào kết nối và làm việc với MCP Orchestrator.

## 1. Kết nối & Định danh (Connection)

Bất kỳ Agent nào khi khởi động và kết nối thành công tới MCP Orchestrator phải thực hiện bước đầu tiên:

- Gọi tool `mcp__orchestrator__register_worker` (hoặc `register_worker` tuỳ namespace).
- Nhận về `worker_id` duy nhất cho session hiện tại.

_Lưu ý: Luôn giữ `worker_id` này trong suốt quá trình làm việc để truyền vào các tool điều phối._

---

## 2. Xác định Vai trò (Role Determination)

Sau khi có `worker_id`, Agent kiểm tra trạng thái Task Queue (thông qua `get_status` hoặc tool tương đương):

- **Nếu Queue chưa có tasks (Trống):** Đảm nhận vai trò **Decomposer Role** (xem Section A).
- **Nếu Queue đã có tasks:** Đảm nhận vai trò **Worker Role** (xem Section B).

---

## Section A — Mẫu Decomposer Role

Vai trò này chịu trách nhiệm bẻ nhỏ một plan/yêu cầu lớn thành các task nhỏ (atomic tasks) cho các worker khác xử lý.

1. **Đọc Plan**:
   - Gọi tool `mcp__orchestrator__get_plan_for_decomposition()` để lấy nội dung file plan tổng.
2. **Phân tích và Chia nhỏ**:
   - Tự động bẻ nhỏ plan thành các atomic tasks theo thứ tự phụ thuộc (dependency order).
   - **Constraints**:
     - Tối đa **20 tasks**.
     - Mỗi task phải đầy đủ các trường yêu cầu (required fields: name, description, dependencies...).
3. **Submit Plan**:
   - Chạy tool `mcp__orchestrator__submit_decomposition(tasks, graph, reasoning)`.
4. **Xử lý Rejection**:
   - Nếu Server/hệ thống reject (báo lỗi validation/cycle trong graph), Agent phải tự đọc lỗi, sửa lại (fix) và resubmit.

---

## Section B — Mẫu Worker Role (Loop)

Vai trò này chịu trách nhiệm nhận từng atomic task, thực thi code và báo cáo kết quả. Quy trình là một vòng lặp liên tục:

1. **Nhận Task**:
   - Gọi tool `mcp__orchestrator__get_next_task(worker_id)`.
   - Kết quả trả về gồm có `task_id` và `file_path` (đường dẫn chi tiết tới file yêu cầu của task).
2. **Đọc Yêu cầu Task (Token-efficient!)**:
   - Sử dụng tool native của bạn (ví dụ: `view_file(file_path)` hoặc lệnh đọc file cục bộ) để đọc chi tiết nội dung.
   - _TUYỆT ĐỐI KHÔNG yêu cầu Server truyền toàn bộ nội dung qua MCP_ để tiết kiệm token.
3. **Thực thi (Implementation)**:
   - Viết code/cấu hình hoàn toàn dựa trên mục `what_to_do` ghi trong file task.
4. **Verify (Kiểm chứng)**:
   - Chạy các lệnh verification đã được ghi rõ trong task để đảm bảo code hoạt động tốt và không phá vỡ logic cũ.
5. **Báo cáo Hoàn thành**:
   - Gọi tool `mcp__orchestrator__complete_task(task_id, status="done", summary, worker_id)`.
6. **Next Task**:
   - Lặp lại bước 1 cho đến khi Queue thông báo hết task.

---

## Blockers (Xử lý Nghẽn)

Nếu trong quá trình làm Worker (Section B), bạn không thể hoàn thành task vì lý do bất khả kháng (thiếu config, spec sai lệch, lỗi thư viện không thể fix...):

- Gọi tool: `mcp__orchestrator__complete_task(task_id, status="blocked", summary="[Lý do cụ thể/Exception]", worker_id)`.
- Dừng vòng lặp đối với task đó.

---

## Rules (Nguyên tắc Quan trọng)

1. ❌ **KHÔNG** sửa file hay logic nằm ngoài phạm vi (scope) của task được giao.
2. ❌ **KHÔNG** tự ý vẽ thêm tính năng hoặc tạo task mới nếu chưa được Decomposer/User yêu cầu.
3. ✅ **LUÔN** báo cáo quá trình làm việc bằng các lệnh `report_progress` (nếu có hệ thống hỗ trợ).
