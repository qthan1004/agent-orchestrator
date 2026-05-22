import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';
import { VERSION } from '../constants.js';
import type { ServerContext } from './context.js';

export function createServer(context: ServerContext): McpServer {
  const server = new McpServer({
    name: "orchestrator",
    version: VERSION
  });
  registerTools(server, context);
  return server;
}
