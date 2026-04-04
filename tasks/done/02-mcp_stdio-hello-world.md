# Minimal MCP Server stdio — Hello World

- **Phase**: A1 — Minimal MCP + Hello World
- **Goal**: Tạo MCP server stdio tối giản với 1 tool `hello_world`, chạy được qua CLI

## Files

| Action | Path |
|--------|------|
| NEW | `src/mcp-server/index.mjs` |
| NEW | `src/index.mjs` |

## What to Do

1. Tạo `src/mcp-server/index.mjs`:
   - Import `McpServer` từ `@modelcontextprotocol/sdk/server/mcp.js`
   - Import `StdioServerTransport` từ `@modelcontextprotocol/sdk/server/stdio.js`
   - Tạo McpServer instance với name `"orchestrator"`, version `"0.1.0"`
   - Register 1 tool: `hello_world`
     - Input: `{ name: z.string().describe("Your name") }`
     - Output: text content `"Hello, {name}! MCP Orchestrator is running."`
   - Connect qua StdioServerTransport

2. Tạo `src/index.mjs`:
   - Entry point đơn giản
   - Khi arg là `serve` hoặc không có arg → chạy MCP server
   - Import và start server từ `src/mcp-server/index.mjs`

## Constraints

- Đọc skill: `reference/skills/token-optimization/SKILL.md`
- Code tối giản, chỉ đủ để verify MCP works
- Không thêm logging phức tạp, config, hay error handling nâng cao ở bước này
- ESM imports only

## Dependencies

- `01-mcp_init-project` phải xong trước

## Verification

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"capabilities":{},"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"2024-11-05"}}' | node src/index.mjs
```

Kỳ vọng: Nhận JSON-RPC response với server capabilities.

## Done Criteria

- [x] `node src/index.mjs` chạy không lỗi (stdio mode, chờ input)
- [x] Server respond JSON-RPC initialize request
- [x] Tool `hello_world` registered trong capabilities
