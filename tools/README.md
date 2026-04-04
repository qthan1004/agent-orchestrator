# Agent Orchestrator Tools

Đây là danh sách các script công cụ hỗ trợ tự động hóa và thao tác với hệ thống.

## Automation Tools (Token-Saving Pattern)

Những công cụ Node.js nhẹ, được tối ưu cho agent phân tích trạng thái qua file markdown thay vì in ra quá nhiều dữ liệu STDOUT. Cách này làm giảm đáng kể token tiêu thụ khi cần monitor hệ thống.

| Tool | Chức năng | Output |
|------|------------|--------|
| `health-check.mjs` | Kiểm tra trạng thái của MCP server health endpoint | `exchange/.tmp/health.md` |
| `queue-status.mjs` | Đếm và liệt kê các file trong `exchange/{inbox,active,outbox}` | `exchange/.tmp/queue-status.md` |
| `init-exchange.mjs` | Tạo cấu trúc thư mục cho workflow `exchange/` | *(console logs)* |
| `task-scanner.mjs` | Phân tích chi tiết metadata các file `.task.json` | `exchange/.tmp/task-scan.md` |

**Quy trình sử dụng mẫu:**
1. Chạy với `node tools/<script.mjs>` bằng Bash/PowerShell.
2. Thiết lập agent sử dụng công cụ đọc nội dung của file cấu trúc MD (`read_file` trên `exchange/.tmp/*.md`).
3. Đọc dữ liệu nhanh mà không bị rác màn hình terminal.
