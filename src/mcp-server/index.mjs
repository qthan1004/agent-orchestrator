import express from 'express';
import { setupMcpRoutes } from './transport.mjs';
import { SHUTDOWN_SIGNALS, API_ROUTES } from '../constants.mjs';
import { loadConfig } from '../config.mjs';
import { StateManager } from './state-manager.mjs';
import { Logger } from '../utils/logger.mjs';

export async function startServer({ port = 3847, host = '127.0.0.1' } = {}) {
  const config = loadConfig({ port, host });
  const logger = new Logger(config.exchange.logs);
  const stateManager = new StateManager(logger);
  
  // Restore state from files on startup
  stateManager.restoreFromFiles();

  const context = { stateManager, logger, config };

  const app = express();

  // Request logging (debug mcp-remote connections)
  app.use((req, res, next) => {
    const sid = req.headers['mcp-session-id'] || 'no-session';
    console.log(`→ ${req.method} ${req.url} [${sid}]`);
    next();
  });

  app.use(express.json());

  // JSON parse error handler — MUST be right after express.json()
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      console.error(`⚠ JSON parse error from ${req.method} ${req.url}:`, err.message);
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error: Invalid JSON' },
        id: null
      });
      return;
    }
    next(err);
  });

  app.get(API_ROUTES.HEALTH, (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: "0.1.0"
    });
  });

  // Setup MCP routes (controller)
  const transports = setupMcpRoutes(app, context);

  // Catch-all error handler (last middleware)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  });

  const httpServer = app.listen(port, host, () => {
    logger.log('SERVER_START', { port, host });
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
    for (const [sid, transport] of Object.entries(transports)) {
      try { await transport.close(); } catch(e) { /* ignore */ }
      delete transports[sid];
    }
    httpServer.close();
    process.exit(0);
  };

  SHUTDOWN_SIGNALS.forEach(signal => process.on(signal, () => shutdown(signal)));
}
