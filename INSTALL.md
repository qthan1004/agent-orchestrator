# Cài đặt và Cấu hình Agent Orchestrator

Dự án này đóng vai trò là một **Local MCP Server** (hoạt động ngầm). Để các ứng dụng client (ví dụ: Antigravity, Claude Desktop) có thể hiểu và kết nối được với Server này, bạn cần tiến hành thiết lập đường dẫn cài đặt vào file cấu hình toàn cục `mcp_config.json`.

## 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18+ trở lên.

## 2. Khởi chạy Server

Agent Orchestrator sử dụng giao thức **Streamable HTTP** tại cổng `3847`. Khởi chạy server bằng lệnh sau trong terminal:

```bash
cd /path/to/agent-orchestrator
node src/index.mjs serve
```

## 3. Cài đặt Cấu hình MCP Client

Vì Orchestrator đã chuyển sang giao thức mạng (HTTP-first), cấu hình của Client trở nên đồng nhất trên mọi hệ điều hành (Windows/Linux/macOS) và **không còn bắt buộc cấu hình đường dẫn tuyệt đối**. Chúng ta sẽ sử dụng công cụ `mcp-remote` để làm cầu nối.

**Vị trí file cấu hình `mcp_config.json` phụ thuộc vào ứng dụng Client:**
- Nếu dùng Antigravity: `~/.gemini/antigravity/mcp_config.json`
- Nếu dùng Claude Desktop: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) hoặc `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

Mở file thiết lập JSON tùy theo Client bạn sử dụng và thêm cấu hình `orchestrator` như sau:

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

## 3. Khởi động lại Client
Sau khi cập nhật file JSON, tiến hành Restart / Làm mới kết nối trong phần MCP Server của cấu hình Client để hệ thống nhận diện các Tools mới.

## 4. Kiểm tra (Verification)
Sau khi kết nối thành công, bạn có thể kiểm tra xem Orchestrator đã hoạt động hay chưa bằng cách:
- **Trên Antigravity**: Mở cửa sổ chat mới, yêu cầu Agent với câu lệnh như: *"Hãy liệt kê các tool hiện có"*. Bạn sẽ thấy các tool như `hello_world`, `get_status` xuất hiện trong danh sách.
- **Trên Claude Desktop**: Kiểm tra biểu tượng cái phích cắm (plug icon) ở góc, nếu thấy sáng lên và hiện tên server `orchestrator` tức là kết nối thành công. Bạn có thể chat trực tiếp: *"Sử dụng tool hello_world của orchestrator cho tôi"*.

Nếu không thấy công cụ xuất hiện, hãy kiểm tra lại log lỗi (thường nằm ở console hoặc Developer Tools của ứng dụng Client) nhằm đảm bảo đường dẫn thư mục khai báo đã hoàn toàn chính xác.
