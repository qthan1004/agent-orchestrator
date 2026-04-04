# Upgrade MCP Server → Streamable HTTP

- **Phase**: A2 — Streamable HTTP + mcp-remote
- **Goal**: Chuyển MCP server từ stdio sang Streamable HTTP transport, chạy như HTTP server

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/index.mjs` |
| MODIFY | `src/index.mjs` |
| MODIFY | `package.json` |

## What to Do

1. Install thêm dependency:
   - `express` — HTTP server framework

2. Update `src/mcp-server/index.mjs`:
   - Import `StreamableHTTPServerTransport` từ SDK
   - Tạo Express app với:
     - `POST /mcp` — MCP Streamable HTTP endpoint
     - `GET /health` — Health check (return JSON: `{ status: "ok", uptime, version }`)
   - Bind `127.0.0.1` only (không expose ra network)
   - Port mặc định: `3847`
   - In banner khi server ready:
     ```
     ┌───────────────────────────────────┐
     │  MCP Server listening :3847       │
     │  Transport: Streamable HTTP       │
     │  Endpoint: /mcp                   │
     │  Health: /health                  │
     └───────────────────────────────────┘
     ```

3. Giữ lại tool `hello_world` + thêm `get_status`:
   - `get_status()` → return `{ server: "orchestrator", version, uptime, transport: "streamable-http" }`

4. Update `src/index.mjs`:
   - Khi arg `serve` → start HTTP server
   - Accept `--port` flag (mặc định 3847)

## Constraints

- Đọc skill: `reference/skills/strict-scope/SKILL.md`
- Tham khảo MCP SDK docs: `StreamableHTTPServerTransport` usage
- Session management: mỗi request có thể tạo transport mới (stateless per-request)
- KHÔNG hardcode paths — dùng `path.join()`

## Dependencies

- `03-mcp_config-antigravity-test` phải xong trước (verify stdio works first)

## Verification

```bash
# Terminal 1: Start server
node src/index.mjs serve --port 3847

# Terminal 2: Health check
curl http://127.0.0.1:3847/health
```

Kỳ vọng: Health endpoint trả JSON `{ "status": "ok", ... }`

## Done Criteria

- [ ] `node src/index.mjs serve` khởi động HTTP server
- [ ] `/health` endpoint trả JSON status
- [ ] `/mcp` endpoint accept POST (Streamable HTTP)
- [ ] Console hiển thị banner + port
- [ ] Server bind `127.0.0.1` only
