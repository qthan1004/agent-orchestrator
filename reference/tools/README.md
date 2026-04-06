# Orchestrator Operational Tools

Scripts vận hành orchestrator. Chạy từ **project root**.

## Danh sách

| Tool | Chức năng | Output |
|------|-----------|--------|
| `health-check.mjs` | Check MCP server status | `exchange/.tmp/health.md` |
| `queue-status.mjs` | Đếm tasks trong `exchange/{inbox,active,outbox}` | `exchange/.tmp/queue-status.md` |
| `init-exchange.mjs` | Tạo cấu trúc `exchange/` directory | *(console)* |
| `task-scanner.mjs` | Liệt kê chi tiết metadata các task files | `exchange/.tmp/task-scan.md` |
| `reset-exchange.mjs` | Xoá toàn bộ data trong exchange/ (giữ cấu trúc) | *(console)* |

## Cách dùng

```bash
node reference/tools/<script.mjs>
```

Agent đọc output từ `exchange/.tmp/*.md` thay vì parse STDOUT → tiết kiệm tokens.
