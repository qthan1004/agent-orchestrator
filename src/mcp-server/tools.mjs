import { z } from 'zod';
import { workerRegistry } from '../utils/worker-registry.mjs';
import { TOOL_NAMES } from '../constants.mjs';

export function registerTools(server) {
  server.registerTool(
    TOOL_NAMES.HELLO_WORLD,
    {
      description: "A simple hello world tool",
      inputSchema: { name: z.string().describe("Your name") }
    },
    async ({ name }) => {
      try {
        return {
          content: [{ type: "text", text: `Hello, ${name}! MCP Orchestrator is running.` }]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.REGISTER_WORKER,
    {
      description: "Register a new worker and get a unique UUID",
    },
    async () => {
      try {
        const worker = workerRegistry.register();
        return {
          content: [{ type: "text", text: JSON.stringify({ worker_id: worker.id }) }]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.GET_STATUS,
    {
      description: "Get server status and version",
    },
    async () => {
      try {
        return {
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
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // TEMPORARY TEST TOOL
  server.registerTool(
    "test_error",
    {
      description: "Trigger a mock error to test isError format",
    },
    async () => {
      try {
        throw new Error("This is a simulated critical database failure!");
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true
        };
      }
    }
  );
}
