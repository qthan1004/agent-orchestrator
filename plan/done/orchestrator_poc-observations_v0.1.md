# POC Observations — v0.1

## Task 03: Antigravity Config & Test
- **Tool Discovery**: Mất khá thời gian do sai sót cấu trúc JSON-RPC config. Client phát hiện chính xác tool `hello_world` sau khi được cấu hình tuyệt đối via `stdio` và tạo New Session. Lỗi "không tìm thấy tool" mặc định xảy ra nếu config nằm ngoài `mcpServers` object hoặc gọi tool ở session cũ. 
- **Latency / Performance**: 
  - Giao tiếp stdio cung cấp input/output rất chuẩn xác với độ trễ thấp do client chạy trực tiếp process node cục bộ.
- **Protocol Strictness**: `mcp-server` qua stdio rất nhạy cảm với external log. Console log ra stdout sẽ làm vỡ JSON-RPC payload và gây lỗi parsing ở client. Cần áp file-backend cho logger.
- **Tool Namespace Prefixing**: (Quan trọng) Antigravity tự động thêm prefix `mcp_<server_name>_` vào tên tool. Mặc dù đăng ký là `hello_world`, client sẽ nhận diện nó dưới tên `mcp_orchestrator_hello_world` nhằm tránh xung đột tên đăng ký với các MCP server khác.

## Task 06: Multi-session Shared State + Graceful Shutdown
- **Graceful Shutdown**: Implement SIGINT (`Ctrl+C`) và SIGTERM signals xử lý thành công, đảm bảo Express HTTP server down và ngắt MCP instance.
- **State Sharing**: Sử dụng singleton instance (`WorkerRegistry`) cho in-memory map. Data state (number of registered workers) share lập tức cho mọi incoming requests. Một remote instance (như mcp-remote connect tới port) có thể query chung state với các instances khác, khẳng định multi-session HTTP transport working properly.
- **Worker Identity**: UUID assignment operation is locked to server-side only. Client depends on Orchestrator as single source of truth for its identify lifecycle.

## Hotfix C: Tool Error Handling
- Bọc tool callbacks bằng try-catch và mock `isError: true` trong response trả về từ `@modelcontextprotocol/sdk` để tránh làm chết session. 
- MCP Server cho phép errors tự nhiên trả về client qua parameter `isError: true` trong content block thay vì throw Error dẫn đến transport crash.
