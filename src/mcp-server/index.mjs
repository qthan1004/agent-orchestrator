import express from 'express';
import { createServer } from './server.mjs';
import { setupMcpRoutes } from './transport.mjs';
import { SHUTDOWN_SIGNALS, API_ROUTES } from '../constants.mjs';

// Setup tools
const server = createServer();

export async function startServer({ port = 3847, host = '127.0.0.1' } = {}) {
  const app = express();
  app.use(express.json());

  app.get(API_ROUTES.HEALTH, (req, res) => {
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
    console.log(`│  Endpoint: ${API_ROUTES.MCP.padEnd(23)}│`);
    console.log(`│  Health: ${API_ROUTES.HEALTH.padEnd(25)}│`);
    console.log(`└───────────────────────────────────┘`);
  });

  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    // Future: flush state to files
    await server.close();
    httpServer.close();
    process.exit(0);
  };

  SHUTDOWN_SIGNALS.forEach(signal => process.on(signal, () => shutdown(signal)));
}

