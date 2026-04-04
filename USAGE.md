# Cẩm Nang Vận Hành Agent Orchestrator (Operation Manual)

Tài liệu này chuẩn hóa toàn bộ quy trình thao tác với Hệ thống Đa Đặc Vụ (Multi-Agent), đi sâu từ bước khởi tạo bối cảnh, giao việc, cho đến quá trình nghiệm thu chất lượng và cách hệ thống chống chịu, phục hồi trước lỗi lập trình do AI tạo ra.

---

## 1. Khởi Tạo & Quản Trị Phiên Làm Việc (Session & Roles)

Để một hệ thống được coi là Orchestrator đúng nghĩa, nó yêu cầu phân tách độc lập bối cảnh thẻ nhớ (mạch tư duy) của các AI Agent. Chúng ta cần thiết lập lưới mạng bao gồm: **Người Lập Kế Hoạch (Planner)** và **Công Nhân (Worker)**.

**[Bước Bắt Buộc] Bật Node Server:** Mở Terminal nội bộ và giữ tiến trình này trực 24/7.
```bash
npm run serve
```

**[Phiên 1] Thiết lập Vai Trò Planner (Cửa sổ IDE hiện tại):**
1. Mở tính năng trò chuyện của Antigravity ở chính cửa sổ hiện tại.
2. Thiết lập vai trò bằng định danh chuẩn (Mẫu System Prompt):
   > "Hệ thống bổ nhiệm bạn là Planner. Hãy thiết lập kết nối bằng `register_worker()`. Vai trò của bạn là Giám sát và Phân cực Yêu cầu. Từ giờ, hãy luôn sẵn sàng dùng Tool đọc tệp tin (view_file) để thấu hiểu tài liệu trong thư mục `plan/` mỗi khi tôi giao việc. Xin hãy phản hồi xác nhận lệnh trực."

**[Phiên 2, 3] Thiết lập Vai Trò Worker (Cửa sổ IDE Độc Lập):**
1. **Lệnh Tiên Quyết**: Nhấn `Ctrl + Shift + N` / `Cmd + Shift + N` (`File > New Window`) để tạo ra một Không Gian Làm Việc hoàn toàn mới. Nạp mã nguồn dự án vào Cửa Sổ này. Hành động này mở ra 1 Session Mới cho Server.
2. Mở Chat Antigravity mới. Thiết lập vòng lặp thi hành (Autonomous Loop) bằng Prompt:
   > "Bạn là Worker. Triển khai lệnh `register_worker()` để đăng ký. Hãy đặt bản thân vào vòng lặp liên tục: gọi `get_next_task()`, đọc mô tả nhiệm vụ, thực thi mã nguồn IDE, và đóng công việc bằng `complete_task()`. Tuân thủ tiến trình lặp này tới khi hàng đợi trống."
3. Bức tranh toàn cảnh: Cửa sổ 2, 3 sẽ điên cuồng bắt API về cổng 3847 chờ Việc. Mọi chuyện sẽ được Server dùng State Manager chốt luồng, không gặp rủi ro Deadlock.

---

## 2. Quy Trình Giao Nhận Kế Hoạch (Plan Handover Protocol)

Mọi giao tiếp cốt lõi về Business Logic giữa **Con Người (Human)** và **Hệ Thống** không thông qua dòng lệnh thuần, mà qua Hồ Sơ Văn Bản.

**Cách Giao Việc Cho Đầu Não:**
1. Con người (Quản trị viên) tạo một hồ sơ (File Markdown) lưu trữ mọi yêu cầu (Ví dụ: `plan/feature_login.md`).
2. Quản trị viên quay ngược trở lại **Phiên 1 (Cửa Sổ Planner)** và ban lệnh:
   > "Tôi vừa thả một dự án mới vào `plan/feature_login.md`. Hãy gọi `get_plan_for_decomposition()`, sử dụng Tool đọc hồ sơ để nắm logic, sau đó dùng công cụ `submit_decomposition()` để phân rã ra cấu trúc DAG và đẩy nó lên Hệ thống Trung tâm."
3. Planner AI nén gói tất cả, đẩy vào Server. Ngay khoảnh khắc đó, các Worker đang trong vòng lặp vô tận (ở Cửa Sổ 2, 3) lập tức bắt được Tín hiệu -> lao vào bốc Task thi hành.

---

## 3. Quy Trình Phân Tích & Nghiệm Thu (Quality & Reporting)

Với cương vị Quản trị viên, bạn không phải theo dõi từng dòng log máy chủ. Bạn quan sát sự thay đổi toàn cục thông qua 2 tiêu điểm lớn:

### Báo Cáo Sơ Đồ Toàn Cảnh (Macro-Board)
Chạy mã scripts sau tại Terminal để hệ thống tự quét và Render trạng thái:
```bash
node tools/task-board.mjs
```
Kết quả tỷ lệ `%` hoàn thành tổng thể, lượng task nằm ở Pending(⬜) - Processing(🔄) - Done(✅) sẽ được in lập tức ra file `tasks/README.md`. Bấm vào đọc để đôn đốc.

### Báo Cáo Thi Hành Chi Tiết Điểm Cuối (Granular Outbox)
Bất kỳ khi nào một Worker xử lý xong lệnh `complete_task(status)`, thông cáo báo chí của nhiệm vụ đó (Thành công/Lỗi, ID con AI nào đã làm) sẽ được Đóng gói thành `.json`. 
Quản trị viên nếu cần chà sát tiểu tiết thì vào kiểm định ở Hòm thư xuất:
👉 `exchange/outbox/task-<ID>.result.json`.

---

## 4. Sự Cố & Tái Thực Thi Tự Động (Error Handling & Re-execution)

Hệ thống được thiết kế mang tính Chống Chịu Lỗi Cực Hình (Crash Tolerance) và có khả năng phục hồi nghiệp vụ (Self-Healing). Điều gì diễn ra khi dòng Code của AI sinh ra bị lỗi nặng?

### Bước Trình Báo Thất Bại (Failure Emit)
Khi Worker đối diện với lỗi Build hoặc thiếu môi trường, nó sẽ ném trực tiếp trạng thái lệnh về máy chủ: `complete_task(status: 'FAILED', summary: 'Cấu hình thiếu Module XYZ')`. Lập tức Task này nằm liệt vịnh viễn đóng mác **FAILED** ở Outbox. 

### Kích Hoạt Thiết Chế Làm Lại (The Retry Mechanism)
Thay vì con người phải thủ công mở file xóa xóa sửa sửa, Quản trị Vấn Đề diễn ra như sau:
1. Bạn (hoặc nhờ Planner ở Cửa số 1 đọc định kỳ Outbox) sẽ bắt được tín hiệu có rủi ro Failed tại ID Task đó.
2. Kích hoạt trực tiếp công cụ API: `request_retry(task_id, reason, attempt)`.
3. Khi Server nhận được gói `request_retry` thông qua giao thức RPC, nó ngay lập tức Lục lọi lại hòm thư báo lỗi, bế xuất Task hỏng kia **đẩy ngược trở lại dòng chảy** (Pending Queue).
4. Do có Task "tái sinh" chen vào Queue, các Worker của bạn (đang rình mồi `get_next_task()`) sẽ tiếp tục kéo task FAILED này trêm tâm thế thực hiện nỗ lực (Attempt) đợt 2 theo những `reason` (góp ý) gửi kèm tới khi nó trở thành Đạt hoàn toàn (DONE).
