# Task 03: Prompts — Cập nhật Ping Routine cho Agent

## Info
- **ID:** PING03-update-ping-prompts
- **Module:** prompts
- **Group:** 3 (Documentation)
- **Dependencies:** PING02-register-ping-tool
- **Priority:** 3

## What to do

Sửa file `prompts/agent-prompt.md` để "huấn luyện" đội ngũ Agent trên Server biết xài chiêu Ping Heartbeat mới được tạo ra.

### 1. Section P (Planner Mode)
- Ở mục "Step 3D" (Execution / Phát đồ thực thi), nhắc nhở Planner nếu việc Deep Scan / Load quá sâu và lâu, cần thỉnh thoảng gọi lệnh `ping` về Server trước khi Time-out xảy ra.

### 2. Section W (Worker Mode)
- Ở mục "Step 3" (Thực hiện file/code theo Task), thêm một cảnh báo KHẨN CẤP: Phải dùng công cụ `ping` gọi về Server nếu việc thực thi local (vd: check log dài, xử lý text, viết code) tốn trên 40+ giây trước khí gọi `complete_task`.

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
- Chạy lệnh check từ khoá: `grep -i 'ping' prompts/agent-prompt.md`
- Đảm bảo từ khoá "Ping" xuất hiện rõ ràng trong cả Section W và P.

## Done Criteria
- [x] Agent được học tool `ping` trong ngữ cảnh Planner
- [x] Agent được học tool `ping` trong ngữ cảnh Worker.
- [x] Logic rành mạch để chống vụ False Stale như lúc nãy.
