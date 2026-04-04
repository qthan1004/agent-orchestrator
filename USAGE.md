# Hướng Dẫn Vận Hành Hệ Thống Đa Đặc Vụ (Multi-Agent)

Vấn đề rắc rối nhất của một MCP Orchestrator là làm sao để phân vai trò cho các hệ thống AI. Bởi vì mặc định các AI (như Claude hoặc các Chat Tab trong 1 cửa sổ VS Code) không có khái niệm "Role" từ ban đầu. Chúng ta phải **mở nhiều ứng dụng độc lập** để tạo ra các Session riêng biệt, và hướng dẫn mỗi AI đóng một vai trò.

Để hệ thống Orchestrator phát huy tác dụng, bạn cần tối thiểu **02 Sessions**: 
1. Một AI làm **Planner / Decomposer** (Người phân chia công việc).
2. Một AI làm **Worker** (Người thi hành).

Dưới đây là kịch bản Tốt Nhất để bạn vận hành dự án này.

---

## 1. Chuẩn Bị Server (Bước chung)

Chỉ có MỘT máy chủ Orchestrator duy nhất làm nhiệm vụ nhận/giao task. 
Đầu tiên, bạn mở **Terminal** tại thư mục dự án và khởi chạy lệnh:

```bash
npm run serve
```
*Ghi chú: Giữ console này luôn chạy. Mọi AI sẽ "báo cáo" tiến độ về cổng 3847 này.*

Tiếp theo, bạn nạp một danh sách công việc mẫu (Plan) vào hệ thống:
```bash
node src/index.mjs plan load plan/test_hello-orchestrator_v0.1.md
```

---

## 2. Khởi tạo Session #1: Đóng vai trò PLANNER.

Bạn tiến hành mở ứng dụng **VS Code đầu tiên**. Đây sẽ là phiên làm việc dành cho Planner.

1. Bật AI Assistant của bạn lên (ví dụ: mở Antigravity Chat).
2. Để chỉ định cho AI này biết nó phải làm Planner, hãy ra lệnh cho nó bằng prompt mồi:
   > *"Sử dụng công cụ của orchestrator: Hãy `register_worker()` để đăng ký. Sau đó dùng `get_queue_status()` để xem tình hình."*
3. Lúc này, AI sẽ nhận thấy hàng đợi `tasks/pending/` đang rỗng, nhưng trong hệ thống có một Plan chưa được phân rã. 
4. Hãy ra lệnh tiếp theo: 
   > *"Hãy dùng `get_plan_for_decomposition()` để lấy plan, đọc kỹ, rồi dùng `submit_decomposition()` để chia nó thành các file task cấu trúc vào hàng đợi inbox."*
5. Plannner sẽ thực thi cắt xẻ công việc. Khi nó báo thành công, vai trò của Session 1 tạm thời dừng lại.

---

## 3. Khởi tạo Session #2: Đóng vai trò WORKER.

Để tạo một **Session mới hoàn toàn**, bạn KHÔNG THỂ tạo đoạn Chat mới ở VS Code cũ. Bạn BẮT BUỘC phải làm 1 trong 2 cách sau:
- **Cách A:** Trên VS Code, vào menu **File > New Window** (Ctrl+Shift+N / Cmd+Shift+N) để đẻ ra 1 cửa sổ hoàn toàn độc lập. Mở Chat Antigravity bên cửa sổ mới này.
- **Cách B:** Mở phần mềm **Claude Desktop** độc lập trên máy tính. 

Ở cửa sổ mới này, bạn giao nhiệm vụ (prompt) để biến AI thành thợ rèn (Worker):
1. Ra lệnh khởi tạo:
   > *"Sử dụng công cụ orchestrator: Hãy gọi `register_worker()` và kiểm tra hàng đợi bằng `get_queue_status()`."*
2. Bây giờ, Worker sẽ thấy có task đang chờ (Pending) do Planner vừa chẻ ra.
3. Ra lệnh thực thi tự động:
   > *"Bạn là Worker. Hãy bắt đầu vòng lặp: liên tục dùng `get_next_task()`, đọc task, thực thi theo mô tả, hoàn thành bằng `complete_task()`. Lặp lại cho đến khi queue rỗng."*
4. Worker sẽ hì hục nhận task từ cổng 3847, xử lý file và báo cáo lại liên tục mà không lo dính líu chi tới màn hình Planner ban đầu.

---

## 4. Scale up: Mở Rộng Ra N Worker (Tối đa công suất)

Sức mạnh của Orchestrator là sự tận dụng Song Song. Khi một Plan đẻ ra 10 Tasks, 1 Worker sẽ chạy làm 10 lần.
Vậy làm thế nào để xong nhanh hơn? **Mở thêm Session!**

1. Bạn lặp lại bước 3: Tạo **File > New Window (#3)**, gọi AI ra và bảo nó: *"Bạn là Worker, hãy request lấy task và làm đi"*.
2. Tạo thêm **File > New Window (#4)**, lặp lại y hệt.
3. Lúc này, ở phần backend Terminal (Bước 1), bạn sẽ thấy log HTTP báo có **03 Worker** đang đổ xô gọi lệnh `get_next_task()`.
4. Orchestrator sẽ đứng giữa và dùng State Manager để Lock những task nào đã có người bốc, và chia task C cho Worker mới nhàn rỗi. Nếu Task D phụ thuộc vào Task A, Worker yêu cầu Task D sẽ bị server "Pending" không giao cho đến khi Task A complete.

## Tóm Lược Nguyên Tắc Kết Nối

- **1 Cửa Sổ Ứng Dụng Độc Lập = 1 Phiên Session = 1 AI Agent (1 Vai Trò)**
- Đừng cố giao 2 Role cho 1 cửa sổ chat vì AI sẽ rất dễ nhầm lẫn context (ngữ cảnh bộ nhớ), làm cho nó tự đánh nhau (vừa phân tích vừa làm task dễ dẫn đến lỗi hallucination). 
- Độc lập các cửa sổ là chìa khoá để quy trình Orchestrator chạy trơn tru tuyệt đối.
