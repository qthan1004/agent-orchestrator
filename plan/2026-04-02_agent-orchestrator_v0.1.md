# Kế hoạch Chi tiết: Standalone Antigravity Orchestrator CLI

Bản kế hoạch này đóng vai trò kim chỉ nam nhằm xây dựng công cụ Orchestrator thành một **NPM Package độc lập**. Gói gọn toàn bộ quy trình Auto-Tasking và Quản trị Vòng Đời Ký ức.

## 1. Kiến trúc Tổng quan NPM Project 

```
antigravity-orchestrator/
├── src/
│   ├── index.mjs              
│   ├── config.mjs             
│   ├── planner/               
│   ├── worker/                
│   └── utils/
│       ├── tools.mjs          
│       ├── memory.mjs         
│       └── checkpoint.mjs     
```

## 2. Giải quyết Trọng điểm: Tầm Nhìn 5W3H & Archive (Rút gọn)

- **Flush Memory:** Ép xuất JSON tóm tắt trước khi tự sát Thread.
- **Archive Table:** Gom Task/Bug vào Markdown Table siêu nhẹ, cấm AI quét tự động. Phân tách theo từng folder Lib.
- **Auto-Delete:** Ý tưởng bị outdate -> Cắm cờ Chờ Xoá.
- **Auto-Save/Checkpoints:** Cảnh báo ở ngưỡng 85% Tokens để Sleep. Save liên tục log để sụp nguồn bằng lệnh `--resume`.

---

## 3. Quản trị Ngoại lệ & Khắc phục Vấn đề Hoạt Động (Exceptions & Timeout)

Thay vì thiết lập những vòng rào cấm cản thụ động, hệ thống sử dụng tư duy thiết kế luồng quy chuẩn để bao bọc các lỗi thường gặp của AI.

### 3.1 Chuyên môn hoá Môi trường (Environment Setup)
- Thay vì để các Worker vặt vãnh thay đổi `package.json` gây rối loạn các môi trường test, hệ thống áp dụng nguyên tắc **"Chuyên biệt hoá"**.
- Nếu Feature bị thiếu thư viện, Tech Lead (Claude) sẽ ưu tiên tạo ra 1 Task mào đầu (Ví dụ: `00-setup-environment.md`) và chỉ định 1 con Agent duy nhất chạy quy trình tải / cập nhật Lib rồi mới giao lại cho các Worker sau tiến tới cày code.

### 3.2 Phân quyền Xung đột qua Orchestrator (Dependency Resolution)
- Việc thiết lập khoá file (File lock) thủ công là quá cồng kềnh. Orchestrator (Claude) sẽ là người giải quyết vấn đề từ trong trứng nước.
- Dựa vào ma trận JSON xuất ra (khung `dependencies` và `context_files`), Claude bằng trí năng đỉnh cao sẽ tự phân bổ: Nếu Task 1 và Task 2 đều cần đâm vào chung 1 file thì phải nối đuôi nhau thực thi. Chỉ các task hoàn toàn tách biệt `context_files` mới được đẩy song song. 

### 3.3 Khắc phục Vấn nạn: Processing Bị Kẹt Quá Lâu (Timeout Hacking)
**Nguyên nhân:** Gần đây, việc AI "ngâm" loading hoặc working cực lâu thường rơi vào 2 khả năng: 1 là API Provider bị nghẽn ngầm (chờ buffer dữ liệu rác), 2 là con AI đang miệt mài sinh ra "văn chương - thought process" (output tokens tốc độ sinh rất chậm) trước khi gọi hàm.
**Giải pháp trong Node.js:**
1. **Thiết lập Timeout Bức Tử (Hard Timeout):** Các SDK khi gọi API thường đứt cước nếu mạng lag hoặc server treo. Node.js sẽ gài tham số `timeout: 15000` (15 giây). Nếu API không trả về response gì sau 15 giây, Node.js sẽ huỷ luồng đó, gọi lấy 1 luồng kết nối API mới tươi mới hơn thay vì để màn hình đơ vô nghĩa.
2. **Context Diet (Ép Cân Input) & Cấm Văn Xuôi:** Chặn tuyệt đối thói quen nạp toàn bộ repo vào mỗi task. Worker chỉ được đưa đúng nội lực `context_files` được phép đọc + Mệnh lệnh cấm tiệt AI sinh ra giải nghĩa (Reasoning code), mà buộc nó gọi thẳng function Code Diff / Write File luôn để giảm Token Delay.

---

## 4. Cơ chế Dữ Liệu Giao Bước (JSON Data Contract)

Từng nốt giao tiếp (Plan/Output/Checkpoints) đều được lưu trữ theo cấu trúc Data JSON nguyên chuẩn.

## Trạng Thái (Status)
Bản kế hoạch **Draft 1.7 (Khắc phục Timeout & Environment Concept)**. Mọi thứ đã sẵn sàng cho kiến trúc sư.
