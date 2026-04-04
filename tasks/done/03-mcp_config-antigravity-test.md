# Config Antigravity + Test Hello World

- **Phase**: A1 — Minimal MCP + Hello World
- **Goal**: Config MCP server trong Antigravity, mở session, gõ hello world, verify response

## Files

| Action | Path |
|--------|------|
| MODIFY | `~/.gemini/antigravity/mcp_config.json` (global config) |

## What to Do

1. Mở Antigravity MCP config:
   - Command palette → `Antigravity: Manage MCP Servers` → `View raw config`
   - Hoặc edit trực tiếp `~/.gemini/antigravity/mcp_config.json`

2. Thêm entry `orchestrator` (stdio mode):
   ```json
   {
     "mcpServers": {
       "orchestrator": {
         "command": "node",
         "args": ["d:/workspace/agent-orchestrator/src/index.mjs"]
       }
     }
   }
   ```
   **Lưu ý**: Dùng absolute path tới `src/index.mjs` vì stdio spawn từ bất kỳ CWD nào.

3. Refresh MCP Servers trong Antigravity

4. Mở **session MỚI** trong Antigravity

5. Gõ: "Gọi tool hello_world với name là 'Orchestrator'" hoặc tương tự để trigger agent gọi MCP tool

6. Ghi lại observations:
   - Tool có hiện trong danh sách tools của agent?
   - Response có đúng format?
   - Latency bao lâu?
   - Token cost cho 1 lần gọi tool?
   - Có error/warning nào trong console?

## Constraints

- KHÔNG sửa code server ở bước này — chỉ config và test
- Nếu có lỗi → ghi lại chi tiết → quay lại sửa task 02

## Dependencies

- `02-mcp_stdio-hello-world` phải xong trước

## Verification

Mở Antigravity session → agent gọi được `mcp__orchestrator__hello_world()` → nhận greeting.

## Done Criteria

- [x] MCP server `orchestrator` hiện trong Antigravity MCP Servers list
- [x] Agent gọi được `hello_world` tool thành công
- [x] Response hiển thị đúng greeting message
- [x] Ghi observations vào `plan/orchestrator_poc-observations_v0.1.md`
