import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
