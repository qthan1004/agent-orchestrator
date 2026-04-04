# Hướng Dẫn Cài Đặt & Cấu Hình Agent Orchestrator

Agent Orchestrator là một **Local MCP Server** nâng cao đóng vai trò như bộ não điều phối cho các AI Agents (ví dụ: Antigravity, Claude). Trái ngược với các tính năng chạy một lần, dự án này cung cấp hệ thống chạy nền (background), ghi nhận log sự kiện, hỗ trợ duy trì trạng thái (checkpoint), và thiết lập luồng công việc (workflows/tasks). 

## 1. Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Git** (để clone repository)
- **Node.js**: Phiên bản 18+ trở lên. (Có thể kiểm tra bằng lệnh `node -v`)
- **NPM** hoặc **Yarn** (Thường đi kèm với Node.js)

## 2. Bước Đầu Cài Đặt (Local Setup)

**Bước 1:** Clone mã nguồn dự án về máy của bạn:
```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
```

**Bước 2:** Cài đặt các thư viện phụ thuộc (`@modelcontextprotocol/sdk`, `express`, `zod`...):
```bash
npm install
```

## 3. Khởi Chạy Orchestrator Server

Agent Orchestrator mặc định sử dụng giao thức **Streamable HTTP**, cung cấp tính ổn định hơn nhiều so với STDIO do dễ dàng hỗ trợ multiple-sessions từ nhiều clients cùng một lúc.

**Để khởi chạy server ở chế độ mặc định (Cổng 3847):**
```bash
npm run serve
# hoặc
node src/index.mjs serve
```

**Đổi cổng mặc định (Custom Port):**
Nếu cổng 3847 trên máy của bạn đang bận, bạn có thể thiết lập cổng khác:
```bash
node src/index.mjs serve --port 4000
```

*Lưu ý: Màn hình console sẽ hiện `🚀 Server is running on port 3847`. Hãy để server chạy dưới background trong lúc sử dụng.*

## 4. Tích Hợp Vào Cấu Hình MCP Clients

Để các AI Assistant như Antigravity hoặc Claude Desktop kết nối được hệ thống này, bạn cần tiến hành khai báo vào file cấu hình toàn cục `mcp_config.json`. Do sử dụng HTTP-first, chúng ta sẽ bắt cầu thông qua công cụ `mcp-remote`.

### Vị trí file cấu hình thao tác
- **Antigravity (Windows)**: `C:\Users\<User>\.gemini\antigravity\mcp_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### File cấu hình JSON mẫu

Mở file JSON tùy theo ứng dụng và tiến hành bổ sung nội dung sau vào mục `mcpServers`:

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3847/mcp", 
        "--transport",
        "http-first"
      ]
    }
  }
}
```
*(Hãy thay `3847` bằng cổng bạn đã đăng ký ở Bước 3 nếu có thay đổi).*

### Bắt Buộc Khởi Động Lại
- **Khởi động lại/Reload Extension** đối với Antigravity.
- **Tắt và mở lại ứng dụng** Claude Desktop.

## 5. Thẩm Định Xem Client Đã Nhận Thức Được Chưa

Để kiểm tra server đã chạy thành công chưa:
1. Yêu cầu AI (Antigravity/Claude): *"Hãy liệt kê mọi công cụ của orchestrator đang có"*.
2. Nếu AI báo thấy các công cụ sau: `register_worker`, `get_queue_status`, `complete_task`, `submit_decomposition`, `update_task_state`... => **Bạn đã Cài Đặt Thành Công!**

## 6. Các Tiện Ích Automation Đi Kèm Tiêu Biểu

Bên cạnh phần lõi, trong thư mục `tools/` có cung cấp các tiện ích giúp quản trị board sau khi cấu hình:

- **task-board.mjs**: Tự động cập nhật thống kê (done/pending) mới nhất từ các file task sang markdown bảng điều khiển:
  ```bash
  node tools/task-board.mjs
  ```
- **check-deps.mjs**: Kiểm tra tự động toàn bộ cây Dependency DAG để biết chính xác task nào đang sẵn sàng có thể làm:
  ```bash
  node tools/check-deps.mjs
  ```
- **git-push.mjs**: Quy trình tối giản thay cho `git add/commit/push` theo format nội bộ (Chỉ nên sử dụng khi làm tool workflow update):
  ```bash
  node tools/git-push.mjs "mô tả nội dung commit"
  ```

## 7. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Vấn đề | Giải pháp khắc phục |
|--------|---------------------|
| Mãi bị pending request khi Client gọi Server | Do server đang được thiết lập quá cứng/lỗi nội bộ. Xem file log tại `exchange/logs/` để dò tìm lỗi code. Hệ thống sở hữu Recovery Module tự ngắt timeout tránh treo Client. |
| **`EADDRINUSE: address already in use`** | Lệnh khởi chạy server xung đột với ứng dụng khác. Hãy stop service chạy cổng 3847 hoặc thiết lập thông qua `--port <tùy-chỉnh>`. |
| Client không thấy Tool nào mcp-remote | Đảm bảo server đang chạy tại đúng http://127.0.0.1:3847/mcp và trong config JSON đã gõ đúng URL này. |
| Bị mất Data Task Giữa Chừng | Orchestrator có chế độ Checkpointing. Mọi thông tin (thất bại/hoàn thành) thao tác Queue sẽ được lưu snapshot theo giờ ở thư mục `exchange/checkpoints/`. Mở ra xem JSON để dò lại trạng thái. |
