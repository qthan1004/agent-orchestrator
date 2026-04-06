# Các Issue cần fix sau (Pending Tasks)

Ghi nhận lại các issue sau quá trình chạy thử để fix sau:

## 1. Cải tiến Prompts & Agent Loop
Cần thiết kế 2 prompt buộc phải loop liên tục cho tới khi người dùng yêu cầu ngưng một cách rõ ràng. 
Cần có sẵn 2 templates chuẩn, bao gồm các thành phần sau:
- **Role:** Xác định rõ vai trò của agent (Planner/Worker).
- **Tham chiếu MCP Tools:** Danh sách các MCP tool nào được phép gọi/cần sử dụng.
- **Thư mục Plan/Task:** Nơi chứa/đọc file plan hoặc task.
- **Thư mục Execution:** Nơi agent thực thi (ví dụ workspace dự án con).
- **Giới hạn (Boundaries):** Giới hạn được phép làm gì, đọc file gì, ở đâu, file nào không được chạm vào.
- **Note:** Vùng điền thêm các yêu cầu/lưu ý đặc biệt khác.

## 2. Lỗi cập nhật trạng thái Task (Task Lock Issue)
- Lỗi hiện tại: Khi task hoàn thành (done) thì hệ thống không chuyển đổi trạng thái thành công. 
- Ngược lại, khi có lỗi xảy ra cũng không có trạng thái lỗi (error) trả về đúng cách.
- **Hệ quả:** Dẫn đến việc task bị lock (chưa được giải phóng / free), làm nghẽn hàng đợi hoặc khiến worker không nhận được task mới.

## 3. Cấu hình thời gian Loop cho Planner
- Planner cần thiết lập thời gian loop dài hơn để tổng hợp và chờ luồng xử lý.
- **Khoảng thời gian (Interval):** ~30 giây đến 1 phút cho 1 lần loop.

## 4. Cấu hình thời gian Loop cho Worker
- Worker cần thiết lập thời gian loop ngắn hơn để phản hồi nhanh với các công việc nguyên tử (atomic tasks).
- **Khoảng thời gian (Interval):** ~10 giây cho 1 lần loop.

## 5. Tối ưu Token Usage trong quá trình Loop
- Việc agent phải loop liên tục dẫn đến tiêu hao quá nhiều token một cách lãng phí.
- Cần tìm tools hoặc thiết kế giải pháp để giảm thiểu token trong các vòng lặp. 
- **Ví dụ:** Khi gọi tool lấy danh sách (queue/tasks), nếu trả về danh sách rỗng (empty) thì agent chuyển ngay sang trạng thái idle (ngủ/chờ) đợi tới vòng lặp tiếp theo, bỏ qua các bước giải thích hay suy luận gây tốn token.

---
> **Lưu ý:** Chỉ ghi nhận lại theo yêu cầu, chưa thực hiện bất kỳ implement code nào.
