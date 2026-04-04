# Hotfix B: Rewrite Transport Multi-Session + GET/DELETE

- **Phase**: Hotfix — Multi-session Transport Fix
- **Goal**: Rewrite transport.mjs theo official SDK pattern để hỗ trợ multi-session thực sự
- **Priority**: 🔴 Critical

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/transport.mjs` |
| MODIFY | `src/mcp-server/index.mjs` |

## What to Do

### 1. Rewrite `transport.mjs` — Multi-session POST handler

Theo [official SDK example](https://github.com/modelcontextprotocol/typescript-sdk), logic POST handler:

```javascript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';
import { createServer } from './server.mjs';
import { API_ROUTES } from '../constants.mjs';

export function setupMcpRoutes(app) {
  const transports = {};

  // POST /mcp
  app.post(API_ROUTES.MCP, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];

    if (sessionId && transports[sessionId]) {
      // ✅ Reuse existing session
      await transports[sessionId].handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // ✅ New session → new transport + new server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      // ❌ Bad request
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null
      });
    }
  });

  return transports;
}
```

**Key differences từ code cũ:**
- Không còn close sessions cũ khi có session mới
- Dùng `isInitializeRequest()` từ SDK để verify
- Dùng `onsessioninitialized` callback (race-condition safe)
- Mỗi session có `createServer()` riêng
- Không cần nhận `server` param nữa

### 2. Thêm GET handler — SSE stream reconnection

```javascript
app.get(API_ROUTES.MCP, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});
```

### 3. Thêm DELETE handler — Session termination

```javascript
app.delete(API_ROUTES.MCP, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});
```

### 4. Update `index.mjs` — Startup flow

```diff
-import { server } from './server.mjs';
-import { registerTools } from './tools.mjs';
 import { setupMcpRoutes } from './transport.mjs';

-registerTools(server);

 export async function startServer({ port, host } = {}) {
   // ...
-  setupMcpRoutes(app, server);
+  const transports = setupMcpRoutes(app);

   const shutdown = async (signal) => {
     console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
-    await server.close();
+    for (const [sid, transport] of Object.entries(transports)) {
+      try { await transport.close(); } catch(e) { /* ignore */ }
+      delete transports[sid];
+    }
     httpServer.close();
     process.exit(0);
   };
```

## Constraints

- Giữ SSE streaming mặc định (KHÔNG set `enableJsonResponse`)
- `setupMcpRoutes` signature thay đổi: `(app)` thay vì `(app, server)`
- Return `transports` object để shutdown có thể iterate cleanup

## Dependencies

- **Phụ thuộc HF-A** (server.mjs phải export `createServer()` trước)

## Verification

```bash
# 1. Start server
node src/index.mjs serve

# 2. Single session test (phải pass)
node tools/test-mcp-client.mjs

# 3. Multi-session test (phải pass)
node tools/test-multi-session.mjs

# 4. Graceful shutdown (Ctrl+C → server dừng sạch)
```

## Done Criteria

- [x] `transport.mjs` hỗ trợ POST + GET + DELETE trên `/mcp`
- [x] 2+ sessions cùng tồn tại song song (không kill nhau)
- [x] Mỗi session tạo McpServer instance riêng (qua `createServer()`)
- [x] Shared state hoạt động (register_worker ở session 1, get_status ở session 2 thấy)
- [x] `index.mjs` không import singleton `server` nữa
- [x] Graceful shutdown close tất cả active transports
- [x] `test-mcp-client.mjs` PASS
- [x] `test-multi-session.mjs` PASS
