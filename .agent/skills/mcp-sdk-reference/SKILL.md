---
name: mcp-sdk-reference
description: Quick reference cho @modelcontextprotocol/sdk — patterns dùng trong project này
---

# MCP SDK Quick Reference

> ⚠️ Skill tạm dùng cho development. Remove sau khi build xong.
> SDK: `@modelcontextprotocol/sdk` (latest)

## 1. Minimal Server (stdio)

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'orchestrator',
  version: '0.1.0',
});

// Register tool
server.tool(
  'hello_world',
  'Say hello to someone',
  { name: z.string().describe('Your name') },
  async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }],
  })
);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 2. Streamable HTTP Transport

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'orchestrator',
  version: '0.1.0',
});

// Register tools on `server` ...

// Streamable HTTP endpoint — handles all MCP communication
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // stateless mode
  });
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Optional: handle GET for SSE fallback
app.get('/mcp', async (req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST.' });
});

// Optional: handle DELETE for session cleanup
app.delete('/mcp', async (req, res) => {
  res.status(405).json({ error: 'Method not allowed.' });
});

app.listen(3847, '127.0.0.1', () => {
  console.log('MCP Server listening on http://127.0.0.1:3847/mcp');
});
```

> [!IMPORTANT]
> **Stateful vs Stateless**: Pattern trên là stateless (mỗi request tạo transport mới).
> Cho stateful sessions (shared state across requests), dùng session management:
> ```javascript
> const sessions = new Map();
> app.post('/mcp', async (req, res) => {
>   const sessionId = req.headers['mcp-session-id'];
>   let transport = sessions.get(sessionId);
>   if (!transport) {
>     transport = new StreamableHTTPServerTransport({
>       sessionIdGenerator: () => crypto.randomUUID(),
>     });
>     transport.onclose = () => sessions.delete(transport.sessionId);
>     await server.connect(transport);
>     sessions.set(transport.sessionId, transport);
>   }
>   await transport.handleRequest(req, res, req.body);
> });
> ```

## 3. Tool Registration Patterns

```javascript
// Simple tool
server.tool('get_status', 'Get server status', {}, async () => ({
  content: [{ type: 'text', text: JSON.stringify({ status: 'ok' }) }],
}));

// Tool with schema
server.tool(
  'complete_task',
  'Mark a task as completed',
  {
    task_id: z.string().describe('Task ID to complete'),
    status: z.enum(['done', 'blocked', 'failed']).describe('Final status'),
    summary: z.string().describe('Brief summary of what was done'),
    worker_id: z.string().describe('Your worker UUID'),
  },
  async ({ task_id, status, summary, worker_id }) => {
    // ... implementation
    return {
      content: [{ type: 'text', text: JSON.stringify({ accepted: true }) }],
    };
  }
);
```

## 4. mcp-remote Config

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3847/mcp",
        "--transport", "http-first"
      ]
    }
  }
}
```

Flags:
- `--transport http-first` — ưu tiên Streamable HTTP, fallback SSE
- `--transport sse-only` — chỉ dùng SSE (deprecated)

## 5. Error Handling

```javascript
server.tool('my_tool', '...', { ... }, async (args) => {
  try {
    // ... logic
    return { content: [{ type: 'text', text: 'OK' }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});
```

## 6. Key Imports

```javascript
// Server
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Transports
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Schema
import { z } from 'zod';
```

## 7. Gotchas

- **ESM only**: SDK exports ESM. Project PHẢI dùng `"type": "module"` hoặc `.mjs`
- **Tool return**: Luôn return `{ content: [{ type: 'text', text: '...' }] }`
- **JSON in text**: Stringify JSON trước khi gửi: `JSON.stringify(data)`
- **Zod describe**: Mỗi param nên có `.describe()` — agent thấy description này
- **Transport close**: Luôn handle `res.on('close')` để cleanup transport
