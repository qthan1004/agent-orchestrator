# POC Observations — v0.1

## Task 03: Antigravity Config & Test
- **Tool Discovery**: Mất khá thời gian do sai sót cấu trúc JSON-RPC config. Client phát hiện chính xác tool `hello_world` sau khi được cấu hình tuyệt đối via `stdio` và tạo New Session. Lỗi "không tìm thấy tool" mặc định xảy ra nếu config nằm ngoài `mcpServers` object hoặc gọi tool ở session cũ. 
- **Latency / Performance**: 
  - Giao tiếp stdio cung cấp input/output rất chuẩn xác với độ trễ thấp do client chạy trực tiếp process node cục bộ.
- **Protocol Strictness**: `mcp-server` qua stdio rất nhạy cảm với external log. Console log ra stdout sẽ làm vỡ JSON-RPC payload và gây lỗi parsing ở client. Cần áp file-backend cho logger.
- **Tool Namespace Prefixing**: (Quan trọng) Antigravity tự động thêm prefix `mcp_<server_name>_` vào tên tool. Mặc dù đăng ký là `hello_world`, client sẽ nhận diện nó dưới tên `mcp_orchestrator_hello_world` nhằm tránh xung đột tên đăng ký với các MCP server khác.
