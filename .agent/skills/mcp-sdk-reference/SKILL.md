---
name: mcp-sdk-reference
description: Quick reference cho @modelcontextprotocol/sdk — patterns dùng trong project này
---
# MCP SDK Quick Reference

> Tạm dùng. Remove sau khi build xong.

## 1. Stdio Server
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'orchestrator', version: '0.1.0' });
server.registerTool('hello', {
  description: 'Greet',
  inputSchema: { name: z.string() }
}, async ({ name }) => ({ content: [{ type: 'text', text: `Hello ${name}` }] }));
await server.connect(new StdioServerTransport());
```

## 2. Streamable HTTP Server
```javascript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

const app = express();
app.use(express.json());

// Factory: mỗi session = 1 server mới
const transports = {};
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].handleRequest(req, res, req.body);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (sid) => { transports[sid] = transport; }
    });
    const server = createServer();  // ← ĐÚNG: factory
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
});

app.listen(3847, '127.0.0.1');
```

## 3. Tool Pattern
```javascript
server.registerTool('name', {
  description: 'Description',
  inputSchema: { param: z.string().describe('...') }
}, async (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);
```

## 4. mcp-remote Config
```json
{ "mcpServers": { "orchestrator": {
  "command": "npx",
  "args": ["-y", "mcp-remote", "http://localhost:3847/mcp", "--transport", "http-first"]
}}}
```

## Gotchas
- ESM only (`"type": "module"`)
- Tool return: `{ content: [{ type: 'text', text: '...' }] }`
- Zod `.describe()` trên mỗi param
- Handle `res.on('close')` cho transport cleanup
