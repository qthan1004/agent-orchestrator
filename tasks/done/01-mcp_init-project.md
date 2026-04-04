# Init Node.js Project

- **Phase**: A1 — Minimal MCP + Hello World
- **Goal**: Khởi tạo Node.js project với ESM, cài dependencies cơ bản

## Files

| Action | Path |
|--------|------|
| NEW | `package.json` |
| NEW | `.gitignore` |

## What to Do

1. Init `package.json` với:
   - `"type": "module"` (ESM)
   - `"name": "agent-orchestrator"`
   - `"version": "0.1.0"`
   - `"private": true`
   - Scripts: `"serve": "node src/index.mjs serve"`
2. Install dependencies:
   - `@modelcontextprotocol/sdk` — MCP SDK
   - `zod` — Schema validation
3. Tạo `.gitignore` nếu chưa có (thêm `node_modules/`, `exchange/.tmp/`)

## Constraints

- ESM only (`import`/`export`), không dùng CommonJS
- Cross-platform: không dùng shell-specific scripts trong package.json

## Dependencies

- None — đây là task đầu tiên

## Verification

```bash
node -e "import('@modelcontextprotocol/sdk/server/mcp.js').then(() => console.log('SDK OK'))"
```

## Done Criteria

- [x] `package.json` tồn tại, `type: module`
- [x] `node_modules/` có `@modelcontextprotocol/sdk` và `zod`
- [x] `.gitignore` có `node_modules/`
