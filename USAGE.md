# Hướng Dẫn Vận Hành Đa Đặc Vụ (Multi-Agent Operation Guide)

Tài liệu này cung cấp quy trình tiêu chuẩn để vận hành hệ thống Agent Orchestrator tích hợp với trình biên dịch Antigravity IDE. Thiết kế cốt lõi của Orchestrator yêu cầu phân tách độc lập các phiên làm việc (sessions) để gán vai trò tối thiểu: **01 Planner** (Phân tích & Lập Kế Hoạch) và **01 Worker** (Thực Thi Nhiệm Vụ).

## 1. Nguyên Tắc Quản Lý Phiên Làm Việc (Session Management)

Trong môi trường Antigravity IDE, mỗi không gian làm việc (Workspace Window / Cửa sổ IDE) tương ứng với **một phiên kết nối duy nhất (1 Session)** tới Orchestrator Server. 
Do đó, KHÔNG THỂ gán đồng thời hai vai trò (Planner và Worker) trong cùng một cửa sổ khung chat của IDE để tránh xung đột ngữ cảnh (context collision) và hiện tượng ảo giác AI.

---

## 2. Khởi Chạy Orchestrator Server (Kiến Trúc Nền)

Trước khi khởi tạo các Agent, hệ thống điều phối trung tâm cần được rẽ nhánh quy trình. Mở Terminal tích hợp của trình soạn thảo và thực thi:

```bash
npm run serve
```

> **Lưu ý:** Luồng tiến trình này yêu cầu duy trì liên tục (Background process). Server sẽ trực (listen) tại phân hệ mạng `3847` (mặc định) và ghi nhận toàn bộ log giao tiếp RPC từ các Agents thông qua giao thức Streamable HTTP. 

Trong một Terminal phụ (độc lập với server), người điều phối có thể tiến hành nạp bản kế hoạch tổng thể (Plan) vào hệ thống:

```bash
node src/index.mjs plan load plan/test_hello-orchestrator_v0.1.md
```

---

## 3. Cấu hình Cửa Sổ IDE #1: Vai Trò PLANNER (Phân Tích)

Khởi động tiến trình xử lý đầu tiên bằng cửa sổ Antigravity IDE hiện tại. Phiên kết nối này sẽ đóng vai trò kiến trúc sư xử lý việc phân rã nghiệp vụ.

1. Bật giao diện tương tác (Chat UI) của Antigravity.
2. Cung cấp **Prompt Định Danh Phiên (Role Initialization Prompt)** như sau:
   > "Hệ thống xác nhận bạn là Planner. Hãy thực thi `register_worker()` để đăng ký phiên làm việc. Tiếp theo, gọi lệnh `get_queue_status()`, phát hiện trạng thái hàng đợi có Plan chờ. Xin hãy dùng `get_plan_for_decomposition()` để trích xuất dữ liệu, tổng hợp logic và sử dụng `submit_decomposition()` nhằm biến hệ thống thành các task vi mô cấu trúc theo dạng DAG."
3. Sau khi Agent xử lý và báo cáo đẩy thành công dữ liệu vào hàng đợi (Pending queue), quá trình vận hành của Planner hoàn tất vòng đời khởi tạo.

---

## 4. Cấu hình Cửa Sổ IDE #2: Vai Trò WORKER (Thực Thi)

Để kích hoạt luồng xử lý xử lý công việc độc lập, hệ thống bắt buộc khởi tạo phiên làm việc thứ hai:

1. Thiết lập Cửa Sổ Độc Lập bằng cách điều hướng **File > New Window** (hoặc nhấn phím tắt `Ctrl + Shift + N` / `Cmd + Shift + N`).
2. Tải và chỉ định đường dẫn ứng dụng (thư mục `agent-orchestrator`) trên cửa sổ mới thiết lập.
3. Kích hoạt Chat UI Antigravity và thiết lập vai trò thực thi (Execution Stage) bằng Prompt mệnh lệnh:
   > "Hệ thống xác định bạn là Worker. Hãy gọi `register_worker()` để thiết lập tính khả dụng. Quản trị vòng lặp tự động (Autonomous Loop): Khởi chạy `get_next_task()`, đọc nội dung tệp tin, chỉnh sửa Source Code/Cầu hình, tự động rà soát đảm bảo chất lượng, và chốt hoàn thành bằng `complete_task()`. Tuân thủ thao tác lặp vòng này tới khi máy chủ hồi đáp trạng thái Empty."
4. Kể từ thời điểm này, Agent #2 sẽ liên kết với Backend và thực hiện tải công việc đơn luồng không tương tác với ngữ cảnh của Planner ở IDE 1.

---

## 5. Mở Rộng Quy Mô Bằng Đa Đặc Vụ (Horizontal Scaling)

Tại trường hợp tổng khối lượng công việc mở rộng, việc cung cấp thêm tiến trình (Workers) sẽ gia tốc cường độ xử lý dự án.

- Tiến hành lặp lại quy định **Bước 4**: Tạo lập thêm các instance `New Window` thứ 3, thứ 4...
- Cung cấp đoạn Prompt thực thi tương ứng. Orchestrator Server ứng dụng hệ thống State Manager xử lý Lock / Dependency Constraints nhằm vô hiệu hóa tình trạng Deadlock (Xung đột nguồn tài nguyên mã nguồn) cho phép hàng chục Worker chạy tích hợp song song.
