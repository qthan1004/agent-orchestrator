import express from 'express';
import { server } from './server.mjs';
import { registerTools } from './tools.mjs';
import { setupMcpRoutes } from './transport.mjs';

// Setup tools
registerTools(server);

export async function startServer({ port = 3847, host = '127.0.0.1' } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: "0.1.0"
    });
  });

  // Setup MCP routes (controller)
  setupMcpRoutes(app, server);

  const httpServer = app.listen(port, host, () => {
    // Pad the port to ensure the ASCII box aligns if port is 4 digits
    const portStr = port.toString().padEnd(4, ' ');
    console.log(`┌───────────────────────────────────┐`);
    console.log(`│  MCP Server listening :${portStr}       │`);
    console.log(`│  Transport: Streamable HTTP       │`);
    console.log(`│  Endpoint: /mcp                   │`);
    console.log(`│  Health: /health                  │`);
    console.log(`└───────────────────────────────────┘`);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    // Future: flush state to files
    await server.close();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
