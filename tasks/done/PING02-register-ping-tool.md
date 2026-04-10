# Task 02: Tools — Đăng ký PING tool qua MCP

## Info
- **ID:** PING02-register-ping-tool
- **Module:** mcp-server
- **Group:** 2 (Implementation)
- **Dependencies:** PING01-add-ping-constants
- **Priority:** 2

## What to do

Thêm MCP Endpoint mới cho Agent gửi "nhịp tim" (heartbeat) về Orchestrator:

1. Đăng ký Tool mới bằng `server.registerTool(...)`
2. Tên Tool: Dùng giá trị `TOOL_NAMES.PING`
3. InputSchema:
   ```js
   worker_id: z.string().describe("Your worker UUID")
   ```
4. Handler Function:
   - Dùng wrapper `withHeartbeat` có sẵn ở đầu hàm.
   - Bắt buộc lấy `worker_id` để cập nhật heartbeats local.
   - Không chứa bất kỳ logic tìm việc (next_task) hay chuyển mode (role).
   - Chỉ return một string đơn giản là `{ status: 'alive' }` hoặc tương tự.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |

## Verification
- Kiểm tra syntax: `node -c src/mcp-server/tools.mjs`
- (Hoạt động tốt nhất thông qua quá trình start server thành công không văng lỗi) `node src/index.mjs`

## Done Criteria
- [x] Hàm `PING` MCP endpoint đã hiển thị
- [x] Tham số đầu vào bắt buộc có `worker_id`
- [x] Wrapper Middleware `withHeartbeat` đã bao bọc logic chính
- [x] Return duy nhất Content JSON string báo Server Alive.
