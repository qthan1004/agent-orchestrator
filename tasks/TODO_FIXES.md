# Các Phát Hiện & Fixes Yêu Cầu (Resolved)

Tất cả các issues dưới đây đã được giải quyết bằng bản nâng cấp Kiến trúc Long Polling và Cải tiến Roles (Thực hiện vào tháng 04/2026).

## 1. Cải tiến Prompts & Agent Loop
- **Status:** ✅ Fixed (Tasks: 18, 19).
- **Chi tiết:** Đã thiết kế 2 file prompt chuẩn tại `prompts/planner-prompt.md` và `prompts/worker-prompt.md`. Bổ sung chuẩn rule 2-mode (Operational / Execution) vào thư mục skills (`SKILL.md`) để kiểm soát hành vi suy luận vòng lặp.

## 2. Lỗi cập nhật trạng thái Task (Task Lock Issue)
- **Status:** ✅ Fixed (Tasks: 13, 14, 15).
- **Chi tiết:** 
  - Sửa logic rename và status update ở `TaskQueue` & `StateManager`. 
  - Fix lỗi silently fail khi đọc/ghi file bằng Explicit Error Handling.
  - Tạo thêm tool `force_release_task` để release task kẹt trong `active/` khẩn cấp dưới dạng override manual.

## 3. Thời gian Loop Planner & 4. Vòng lặp Worker & 5. Tối ưu Token Usage
- **Status:** ✅ Fixed (Tasks: 02, 05, 06, 07, 10, 11).
- **Chi tiết:** 
  - Bỏ kiến trúc Client-side Loop liên tục. Chuyển hoàn toàn sang kiến trúc **Long Polling**.
  - Khi gọi tool `get_next_task` hoặc `check_plans`, MCP Server sẽ giữ pending request trên server-side cho đến khi có task mới/plan mới (max time cấu hình được, mặc định 30s), nếu hết mới văng ra `IDLE`. Cơ chế `AutoHeartbeat` thay thế loop ngầm, tiết kiệm 95% token tiêu thụ.

---

# Cải Tiến Bổ Sung (New Architecture)

Trong quá trình thực thi Fixes trên, chúng tôi đã đưa vào hệ thống các nâng cấp:

### 1. The Auto-Pickup Loop
- Worker có thể hoàn tất task thông qua `complete_task` (với `auto_pickup = true`) và Server sẽ lập tức trả về task kế tiếp trong output của `complete_task`, nhúng thẳng vòng lặp làm 1, giảm số lượng tool calls đi 50%. (Task: 10, 12).

### 2. Planner Re-election (Chuyển hoá Roles)
- **Status:** ✅ Completed (Tasks: 08, 09).
- **Chi tiết:** Cân bằng tải tự động. Worker gọi `get_next_task` khi rảnh rỗi và system không có Planner -> Server sẽ văng directive `BECOME_PLANNER` lệnh cho Agent đọc `SKILL.md` và đổi operational context thành Planner. Tự động phục hồi khi Planner gặp sự cố sập.

### 3. Startup UX Interactive Prompt
- **Status:** ✅ Completed (Tasks: 16, 17).
- **Chi tiết:** Khi boot MCP Orchestrator qua terminal, chạy ra giao diện CLI Interactive prompt lựa chọn config timeout, port session theo tuỳ chọn thay vì hardcode default. (Sử dụng `readline`).
