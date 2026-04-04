# Hướng Dẫn Vận Hành Đa Đặc Vụ (Chỉ dùng Antigravity IDE)

Vì bạn chỉ sử dụng duy nhất **Antigravity IDE**, đây là hướng dẫn chính xác nhất để bạn có thể biến hệ thống này thành một dây chuyền làm việc với tối thiểu **2 vai trò (1 Planner và 1 Worker)**.

Bản chất của Antigravity IDE là nó chỉ khởi động **một đường kết nối (1 Session)** cho mỗi lần bạn mở một cửa sổ làm việc (Window). Do đó, bạn không thể nhét 2 vai trò vào cùng 1 cửa sổ, mà phải dùng tính năng **Mở thêm cửa sổ mới (New Window)**.

---

## Bước 1: Khởi động Server (chạy ngầm)

Đầu tiên, bạn cần mở Terminal (Ctrl+`) ngay trong cửa sổ IDE hiện tại và chạy:
```bash
npm run serve
```
*(Cứ để Terminal này chạy ngầm, đây là "bộ não" trung tâm điều phối mọi cửa sổ).*

Tiếp theo, bạn mở một tab Terminal thứ 2 (dấu `+` trên Terminal panel) để nạp bản thiết kế công việc (Plan) vào Server:
```bash
node src/index.mjs plan load plan/test_hello-orchestrator_v0.1.md
```

---

## Bước 2: Thiết lập Cửa Sổ IDE Đầu Tiên (ROLE: PLANNER)

Cửa sổ Antigravity IDE bạn **đang mở hiện tại** sẽ đóng vai trò là Trưởng nhóm (Planner / Decomposer).

1. Bật khung chat Antigravity lên.
2. Bạn gõ câu Thần chú này vào khung chat:
   > "Bạn là Planner. Dùng công cụ `register_worker()` để đăng ký. Sau đó dùng `get_queue_status()`. Bạn sẽ thấy có plan chờ. Hãy dùng `get_plan_for_decomposition()` lấy nó ra, phân tích và gọi `submit_decomposition()` để biến nó thành các task nhỏ."
3. Antigravity ở cửa sổ này sẽ thi hành và phản hồi lại kết quả phân kỳ (chia task). Lúc đó, công việc của Planner này xem như tạm xong, bạn cứ để cửa sổ đó nằm yên.

---

## Bước 3: Mở Cửa Sổ IDE Thứ Hai (ROLE: WORKER)

Đây là bước quan trọng mấu chốt để hệ thống có phiên kết nối (Session) thứ 2:
1. Bạn chĩa chuột lên thanh Menu trên cùng: Chọn **File -> New Window** (Hoặc bấm `Ctrl + Shift + N`).
2. Giao diện một cái Antigravity IDE trống không sẽ bật lên đè lên màn hình. Đừng lo lắng, hãy giữ nguyên trạng thái "New Window" đó.
3. Kéo thả thư mục dự án `agent-orchestrator` vào cái New Window này (để nó hiểu Workspace).
4. Mở luôn cái khung chat Antigravity của cái cửa sổ mới này ra.
5. Bạn ném câu Thần chú này vào cho Worker:
   > "Bạn là Worker. Hãy gọi `register_worker()`. Bắt đầu vòng lặp: Xin việc qua `get_next_task()`, làm xong việc thì báo bằng `complete_task()`. Lặp lại cho đến khi queue báo Error/Empty."
6. Lúc này, cửa sổ IDE thứ 2 sẽ hì hục nhận các file task (mà Planner ở màn hình cũ đã chẻ ra) để xử lý.

---

## Bước 4: (Tùy chọn) Khởi tạo thêm Worker số 2, số 3...

Nếu số code cần viết quá lớn hoặc Planner vừa chẻ ra hẳn 20 task:
1. Bạn lại tiếp tục bấm **File -> New Window** (Ctrl + Shift + N).
2. Lại mở khung chat ra và ném câu lệnh thần chú vòng lặp của Worker vào.
3. Cứ làm lại như vậy, bạn có thể tạo thành một xưởng cày code với 3, 4 cửa sổ IDE cùng song song giải quyết kho task. Orchestrator Server (ở Bước 1) sẽ dùng cơ chế *Lock state* để điều phối, không để 2 Worker bị trùng một task.
