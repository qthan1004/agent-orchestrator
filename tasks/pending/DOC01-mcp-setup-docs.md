# Task DOC01: MCP Setup Documentation

## Info
- **ID:** DOC01-mcp-setup-docs
- **Module:** docs
- **Priority:** low
- **Ref:** EV04

## What to do

Viết documentation hướng dẫn setup MCP config cho orchestrator server — để ai cũng dùng được, không chỉ trên máy local.

### Nội dung cần cover:
1. Cách thêm `agent-orchestrator` vào `mcp_config.json`
2. Paths theo OS (Windows/Linux/macOS)
3. Giải thích `background: "always"` cho ping tool
4. Cách thay `cwd` cho đúng workspace path của user
5. Troubleshooting: server không start, port conflict, etc.

### Đặt ở đâu:
- `README.md` (section "MCP Setup") hoặc
- `dev-docs/guide_mcp-setup.md` (nếu dài)

## Done Criteria
- [ ] Document tồn tại và dễ hiểu cho người mới
- [ ] Cover cả Windows và Linux paths
