# Goal: Add Active Ping Mechanism for Agents

Tình trạng Orchestrator lầm tưởng Agent đã chết do Agent tốn quá nhiều thời gian gọi công cụ Local (như `view_file`...) tại quá trình Execute/Decompose. Kế hoạch này áp dụng cơ chế tự chủ: cho phép Agent tự "báo danh" (Ping) sự tồn tại của mình bằng tool MCP `ping` độc quyền, giữ Task/Plan không bị thu hồi oan uổng.

## User Review Required

Kiểm tra phần "Điều kiện áp dụng Prompt" và "Nguyên tắc Return của Tool", đảm bảo `ping` hoàn toàn vô hại với luồng Role (chưa làm ảnh hưởng tới config Idle sẵn có của bạn). 

## Proposed Changes

---

### Mảng 1: Constants & Tools Mapping

#### [MODIFY] [constants.mjs](file:///home/administrator/back%20up/agent-orchestrator/src/constants.mjs)
- Thêm tool name mới vào object `TOOL_NAMES`:
  ```javascript
  PING: "ping",
  ```

#### [MODIFY] [tools.mjs](file:///home/administrator/back%20up/agent-orchestrator/src/mcp-server/tools.mjs)
- Tại hàm `registerTools`, đăng ký tool `PING`:
  - **Description**: Ping the orchestrator to keep your heartbeat alive during long local operations.
  - **Input**: `{ worker_id: string }`
  - **Logic Cốt Lõi**: 
    - Chỉ chạy middleware `withHeartbeat(..., context)` để tự động update `workerRegistry.last_heartbeat`. 
    - **TUYỆT ĐỐI KHÔNG** đính kèm logic check Queue, KHÔNG chạy vòng lập Recovery, cũng KHÔNG trả về các lệnh chuyển Role (như `BECOME_PLANNER`). 
  - **Return**: Trả về dữ liệu tĩnh cực đơn giản `{ "status": "alive" }`. Đảm bảo Agent gọi ping xong thì thôi, không bị làm loạn (hay nảy sinh conflict action).

---

### Mảng 2: Agent Protocol & Prompt

#### [MODIFY] [agent-prompt.md](file:///home/administrator/back%20up/agent-orchestrator/prompts/agent-prompt.md)
Sẽ bổ sung và điều chỉnh **Rule số 12** trong phần *Rules & Constraints* kết hợp với quá trình Implement/Decompose:

- **Giới hạn Áp Dụng (Scope Constraint)**: 
  "Lệnh `ping` CHỈ bắt buộc đối với các Agent đang ĐÃ VÀ ĐANG cầm Task (`action: EXECUTE`) hoặc ôm Plan (`action: DECOMPOSE`). Đối với các Agent đang rảnh rỗi chờ việc ở chế độ Idle (Poll), tuyệt đối không tự ý gọi `ping` mà hãy bám sát giao thức Idle."

- **Với Worker (Lúc đang viết Code / Test):** 
  "CRITICAL: Quá trình viết code hoặc debug có thể tốn rất nhiều turn, nếu bạn hoạt động trên Local System mà không giao tiếp với Server qua MCP Tools, Server sẽ tưởng bạn bị kẹt (Stale) và chuyển Task ngược về Inbox, dẫn tới lỗi xử lý trùng lặp. Đang ôm Task thì thi thoảng PHẢI ghim theo 1 lệnh `ping` khi liên tục chỉnh sửa local."

- **Với Planner (Lúc Workspace Discovery):**
  "CRITICAL: Trong suốt quá trình Discovery (Step 3A/3B), nếu bạn gọi liên tiếp các lệnh đọc file nội bộ (`view_file`, `grep_search`) quá 3 lệnh, Server sẽ tưởng bạn đã chết và gỡ quyền thao tác Plan. Nhớ chèn kèm công cụ `ping(worker_id: your_id)` chạy song song với các lệnh đọc file."

#### [MODIFY] Tùy chọn trên file copy (Nếu có)
Thay đổi tương tự trên file prompt copy trong `Personal lib` của dự án hiện tại.

## Verification Plan

### Automated
- Chạy `test.mjs` có sẵn để check cú pháp `tools.mjs` xem server lên bình thường không.

### Manual / Autonomous
- Kiểm tra Agent Idle: Đảm bảo nó vẫn yên lặng gọi `get_next_task` để đợi thay vì gọi `ping`.
- Kiểm tra Role Switch: Đảm bảo khi gửi Tool Ping, JSON Payload trả về chỉ là `"alive"`, Agent nhận JSON này và đi làm tiếp công việc Local của nó chứ không bất thình lình bỏ dở mã nguồn.
