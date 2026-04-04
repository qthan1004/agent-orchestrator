# Hotfix A: Refactor Server → Factory Pattern

- **Phase**: Hotfix — Multi-session Transport Fix
- **Goal**: Chuyển McpServer từ singleton sang factory function để hỗ trợ multi-session
- **Priority**: 🔴 Critical

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/server.mjs` |

## What to Do

### 1. Chuyển `server.mjs` sang factory function

**Trước** (singleton — SAI):
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export const server = new McpServer({ name: "orchestrator", version: "0.1.0" });
```

**Sau** (factory — ĐÚNG):
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.mjs';

export function createServer() {
  const server = new McpServer({
    name: "orchestrator",
    version: "0.1.0"
  });
  registerTools(server);
  return server;
}
```

### Lý do

MCP SDK official example (`simpleStreamableHttp.js`) sử dụng `getServer()` factory — tạo McpServer MỚI cho mỗi session. SDK error message nói rõ:

> "Call close() before connecting to a new transport, or **use a separate Protocol instance per connection**"

## Constraints

- `registerTools(server)` phải được gọi TRONG factory — mỗi server instance cần có đầy đủ tools
- `workerRegistry` singleton trong `tools.mjs` vẫn giữ — tất cả server instances share cùng registry → shared state

## Dependencies

- Không phụ thuộc task khác, nhưng **task HF-B phụ thuộc task này**

## Verification

```bash
# Code phải import được mà không lỗi
node -e "import('./src/mcp-server/server.mjs').then(m => { const s = m.createServer(); console.log('OK:', typeof s.connect); })"
```

## Done Criteria

- [x] `server.mjs` export `createServer()` function (không còn export singleton)
- [x] `createServer()` trả về McpServer instance có đầy đủ tools registered
- [x] Không có circular import giữa `server.mjs` ↔ `tools.mjs`
