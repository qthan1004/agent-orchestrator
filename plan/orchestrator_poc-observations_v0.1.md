# POC Observations — v0.1

## Task 03: Antigravity Config & Test
- **Tool Discovery**: Client phát hiện chính xác tool `hello_world` sau khi được cấu hình tuyệt đối via `stdio`. Cần thiết phải tạo session (New Chat) mới để load mcp config. Lỗi "không tìm thấy tool" điển hình đến từ việc gọi tool ở session cũ.
- **Latency / Performance**: 
  - Độ trễ gần như = 0 vì giao tiếp nội bộ qua IPC `stdio`.
  - Không có cảnh báo hay lỗi kết nối ở console ngầm định.
- **Protocol Strictness**: `mcp-server` qua stdio rất nhạy cảm với việc lọt std string. Console log ra stdout sẽ làm vỡ JSON-RPC payload và gây lỗi parsing ở client. Cần áp file-backend cho logger.
