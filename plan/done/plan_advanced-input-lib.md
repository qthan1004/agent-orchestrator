---
title: Advanced Scaffold & Create Input Library
version: 1.0
---

# Objective
Tạo một thư viện component `input` tại workspace đích. Việc này không đơn thuần tạo 2 file, mà yêu cầu sử dụng đúng quy trình CI/CD và Script chuẩn được viết sẵn tại dự án đó.

# Context & Instructions for Planner 🧠
Mục tiêu hoạt động của task này nằm ở: `d:\workspace\react-lib-workspace`.
Để xây dựng một DAG Plan hoàn chỉnh cho Worker, bạn (Planner) **PHẢI LÀM** các bước sau trước khi gọi `submit_decomposition`:
1. Dùng tool đọc file quy trình gốc: `d:\workspace\react-lib-workspace\.agent\workflows\create-lib.md`.
2. Hình dung logic các bash shell như `gen-lib.sh` trong `d:\workspace\react-lib-workspace\tools`.
3. Bỏ qua các bước "Human in the loop" (chờ review) trong file workflow đó (nếu có), ép lại thành chuỗi tự động hoá hoàn toàn 100%.

# Suggested DAG Tasks (Tham khảo)
Hãy phân rã thành tối thiểu 3 task theo thứ tự:
1. **Task 1 (Scaffold):** Chạy lệnh `bash tools/gen-lib.sh input` bên trong `react-lib-workspace` để sinh ra bộ khung chuẩn.
2. **Task 2 (Implementation):** Implement logic React & UI cho Component Input. Hãy nhắc nhở Worker tuân thủ các `.agent/skills` có sẵn ở dự án đó (như `styled-theme-convention.md`,... ).
3. **Task 3 (Verify):** Chạy `npm install` và `npx vite build` bên trong `libs/input` để xác thực là thư viện vừa build có thể complile thành công mà không có lỗi.

# Worker Strict Directives 🛑 (BẮT BUỘC TRUYỀN VÀO TASK DETAIL)
- Mọi câu lệnh Bash (`run_command`) **bắt buộc** set Cwd (Current Working Directory) là: `d:\workspace\react-lib-workspace`.
- Thư mục làm việc hiện tại của bạn CHỈ xoay quanh `d:\workspace\react-lib-workspace`.
- Dùng `get_next_task` để lấy lệnh. Cập nhật tiến độ cẩn thận và gọi `complete_task` khi dứt điểm từng phase.
