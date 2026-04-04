import { z } from 'zod';
import { workerRegistry } from '../utils/worker-registry.mjs';

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
    "register_worker",
    {
      description: "Register a new worker and get a unique UUID",
    },
    async () => {
      const worker = workerRegistry.register();
      return {
        content: [{ type: "text", text: JSON.stringify({ worker_id: worker.id }) }]
      };
    }
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
          transport: "streamable-http",
          connected_workers: workerRegistry.getAllWorkers().length
        })
      }]
    })
  );
}
