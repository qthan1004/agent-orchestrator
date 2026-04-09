import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.mjs';
import { VERSION } from '../constants.mjs';

export function createServer(context) {
  const server = new McpServer({
    name: "orchestrator",
    version: VERSION
  });
  registerTools(server, context);
  return server;
}
