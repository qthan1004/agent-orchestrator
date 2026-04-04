import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

const server = new McpServer({
  name: "orchestrator",
  version: "0.1.0"
});

server.registerTool(
  "hello_world",
  {
    description: "A simple hello world tool",
    inputSchema: { name: z.string().describe("Your name") }
  },
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name}! MCP Orchestrator is running.` }]
  })
);

server.registerTool(
  "get_status",
  {
    description: "Get server status and version",
  },
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify({
        server: "orchestrator",
        version: "0.1.0",
        uptime: process.uptime(),
        transport: "streamable-http"
      })
    }]
  })
);

export async function startServer(port = 3847) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: "0.1.0"
    });
  });

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, '127.0.0.1', () => {
    // Pad the port to ensure the ASCII box aligns if port is 4 digits
    const portStr = port.toString().padEnd(4, ' ');
    console.log(`┌───────────────────────────────────┐`);
    console.log(`│  MCP Server listening :${portStr}       │`);
    console.log(`│  Transport: Streamable HTTP       │`);
    console.log(`│  Endpoint: /mcp                   │`);
    console.log(`│  Health: /health                  │`);
    console.log(`└───────────────────────────────────┘`);
  });
}
