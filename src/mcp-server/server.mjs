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
