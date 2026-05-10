---
name: Orchestrator Protocol
description: Giao thức cốt lõi cho các Agent (Decomposer và Worker) khi tương tác với MCP Orchestrator Server.
---

# Orchestrator Protocol

> Legacy note: `get_next_task`, auto-pickup semantics, and worker-driven task claiming are compatibility-only pull APIs. Canonical hybrid flow is assignment-first: Head submits task metadata, Orchestrator assigns payload, Worker executes exactly one assigned task, then reports completion.

Tài liệu này định nghĩa giao thức chuẩn cho bất kỳ Agent nào kết nối và làm việc với MCP Orchestrator. 
> 💡 Xem **Prompt Template chuẩn (unified)** tại `prompts/agent-prompt.md`. Template này hỗ trợ dynamic role switching giữa Worker ↔ Planner, agent tự chuyển role dựa trên directive từ Server.

## 2-Mode Operating Pattern
Tất cả các agent trong hệ thống hoạt động theo 2 chế độ xen kẽ (2-Mode Pattern):
- **Operational Mode (Coordination):** Điều phối hệ thống. Trong Mode này, Agent chỉ đơn thuần **gọi tool hệ thống** (ví dụ: `register_worker`, `check_plans`, `submit_task`) và **đọc directive từ Server**. Không thực hiện sửa đổi code trên local workspace, không tự ý suy luận lan man.
- **Execution Mode (Implementation):** Thực thi. Ngay sau khi Operational Mode trả về một task hoặc plan cụ thể, Agent chuyển sang Execution Mode. Lúc này Agent cần **suy nghĩ kỹ càng**, đọc kỹ yêu cầu, viết/chỉnh sửa code trên user workspace, và verify. Sau đó gọi hàm complete hoặc submit để hoàn tất và *tức khắc trở lại Operational Mode*.

---

## 1. Kết nối & Định danh (Connection)

Bất kỳ Agent nào khi khởi động và kết nối thành công tới MCP Orchestrator phải thực hiện bước đầu tiên:
- Gọi tool `mcp__orchestrator__register_worker` (hoặc `register_worker` tuỳ namespace).
- Nhận về `worker_id` duy nhất cho session hiện tại.

_Lưu ý: Luôn giữ `worker_id` này trong suốt quá trình làm việc để truyền vào các tool điều phối._

---

## 2. Xác định Vai trò & Role Transitions

Sau khi gọi `register_worker`, Server sẽ phản hồi cả role mặc định cho Agent (dựa trên trạng thái Task Queue hiện tại). Tuy nhiên trong quá trình hoạt động, Role có thể bị thay đổi:

- **Server-driven Transitions**: Server có thể trả về action `BECOME_PLANNER` khi đang làm Worker. Khi nhận action này, Agent phải lập tức chuyển sang flow của Planner (xem Section A).
- **Compatibility-only pull flow**: Nếu hệ thống cũ còn giữ `get_next_task` hoặc auto-pickup, chúng chỉ là đường tương thích tạm thời, không phải canonical protocol.

---

## Section A — Mẫu Decomposer Role (Planner)

Vai trò này chịu trách nhiệm bẻ nhỏ một plan/yêu cầu lớn thành các task nhỏ (atomic tasks) cho các worker khác xử lý.

1. **Đọc Plan**:
   - Dùng tool `check_plans` (Operating Mode). Server sẽ trả về nội dung plan (inline).
2. **Phân tích và Chia nhỏ (Execution Mode)**:
   - Đọc kỹ text plan, chia nhỏ thành các atomic tasks theo DAG dependency.
3. **Submit Plan**:
   - Gọi tool `submit_decomposition(tasks, graph, reasoning, source_plan)`.
   - Với workflow assignment-first, Planner cũng có thể tạo task markdown trong workspace rồi gọi `submit_task(task_id, workspace_id, task_content_path)` để đăng ký metadata dispatch.
   - Lưu ý xử lý lỗi (nếu có cycle/dependencies sai form).

---

## Section B — Mẫu Worker Role (Executor)

Chịu trách nhiệm nhận từng atomic task, thực thi code và báo cáo kết quả. Quy trình là một vòng lặp liên tục:

1. **Nhận Task (Operational Mode)**:
   - Trong canonical hybrid flow, Worker không tự gọi `get_next_task`.
   - Orchestrator spawn Worker và inject assignment payload trực tiếp qua `stdin`, gồm `task_id`, workspace scope, target files, và task details.
2. **Đọc Yêu cầu Task (Execution Mode)**:
   - Đọc trực tiếp assignment payload đã được Orchestrator gắn sẵn. Không tự claim task khác, không poll queue.
3. **Thực thi**:
   - Viết code/cấu hình dựa trên mô tả của task.
4. **Verify**:
   - Chạy các lệnh verification ghi rõ trong task (nội bộ workspace).
5. **Báo cáo Hoàn thành**:
   - Báo kết quả của đúng assignment hiện tại về Server. Không dùng auto-pickup như canonical flow.
6. **Lặp (Loop)**:
   - Worker một-shot sẽ thoát sau khi báo kết quả. Orchestrator tự quyết định assignment tiếp theo.

---

## Phụ lục: MCP Tools List

Các tools được orchestrator cung cấp:
- `register_worker`: Đăng ký worker_id.
- `get_next_task`: Legacy pull API, chỉ dùng cho compatibility flow.
- `complete_task`: Hoàn thành task (báo cáo result).
- `check_plans`: Kiểm tra & nhận plan pending (dành cho planner).
- `submit_decomposition`: Nộp plan đã chia nhỏ (dành cho planner).
- `submit_task`: Đăng ký task file từ workspace vào canonical assignment-first dispatch.
- `get_status` / `get_queue_status`: Xem info server / số lượng task.
- `report_progress`: Update tiến độ khi chạy task dài.
- `request_retry`: Xin chạy lại task bị failed/blocked.
- **`force_release_task`**: (MỚI) Tool cho phép ép thả một task đang kẹt trong `active/` về lại `inbox/` (manual override cho debug).
