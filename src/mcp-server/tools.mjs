import { z } from 'zod';

export function registerTools(server) {
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
}
