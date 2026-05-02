import express from 'express';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { setupMcpRoutes } from './transport.js';
import { SHUTDOWN_SIGNALS, API_ROUTES, VERSION, type ShutdownSignalValue } from '../constants.js';
import { StateManager } from './state-manager.js';
import { RecoveryManager } from './recovery.js';
import { PlanWatcher } from './plan-watcher.js';
import { workerRegistry } from '../utils/worker-registry.js';
import { Logger } from '../utils/logger.js';
import { bootstrapDirectories } from '../utils/bootstrap.js';
import { startBrainWatcher, stopBrainWatcher } from '../agents/antigravity/brain-watcher.js';
import type { AppConfig, ServerContext } from '../models/index.js';

export async function startServer(config: AppConfig): Promise<void> {
  const { port, host } = config.server;

  // Bootstrap: tạo toàn bộ thư mục cần thiết trước khi khởi tạo bất kỳ service nào
  const { created, failed, skipped } = bootstrapDirectories(config);
  if (failed.length > 0) {
    console.error('❌ Failed to create directories:', failed);
    process.exit(1);
  }
  if (created.length > 0) {
    console.log(`📁 Created ${created.length} missing directories (${skipped} already existed).`);
  } else {
    console.log('📁 All directories present.');
  }

  const logger = new Logger(config.exchange.logs);

  // Cleanup disconnected workers from previous runs
  const cleanedWorkers = workerRegistry.cleanupDisconnected();
  if (cleanedWorkers > 0) {
    console.log(`🧹 Cleaned ${cleanedWorkers} disconnected worker(s) from previous session.`);
    logger.log('WORKERS_CLEANED', { count: cleanedWorkers });
  }

  // StateManager receives config with overrides (from startup-prompt)
  const stateManager = new StateManager(logger, config);

  // Recovery manager — handles crash recovery + stale worker monitoring
  const recoveryManager = new RecoveryManager({
    stateManager,
    workerRegistry,
    logger,
    config
  });

  // Run startup recovery (replaces raw restoreFromFiles)
  // 1. Check clean shutdown marker
  // 2. If unclean → detect & requeue orphans
  // 3. Restore state from files
  // 4. Start monitoring interval (5s)
  // 5. Clear marker
  const { wasClean, orphanCount } = recoveryManager.runStartupRecovery();

  // Plan watcher — auto-polls plan/pending/ directory
  const planWatcherIntervalMs = config.planWatcher?.intervalMs || 30_000;
  const planWatcher = new PlanWatcher({
    stateManager,
    logger,
    intervalMs: planWatcherIntervalMs
  });
  planWatcher.start();

  // Start brain watcher alongside MCP server
  if (process.env.AG_BRAIN_WATCHER !== 'false') {
    startBrainWatcher();
  }

  // Pass workerRegistry via context for DI (tools.ts uses it from here)
  const context: ServerContext = { stateManager, workerRegistry, logger, config, recoveryManager, planWatcher };

  const app = express();

  // Request logging (debug mcp-remote connections)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const sid = req.headers['mcp-session-id'] || 'no-session';
    console.log(`→ ${req.method} ${req.url} [${sid}]`);
    next();
  });

  app.use(express.json());

  // JSON parse error handler — MUST be right after express.json()
  const jsonParseErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
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
  };
  app.use(jsonParseErrorHandler);

  app.get(API_ROUTES.HEALTH, (req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: VERSION,
      last_start_clean: wasClean,
      orphans_recovered: orphanCount,
      connected_workers: workerRegistry.getActiveWorkerCount(),
      plan_watcher: planWatcher.getStats()
    });
  });

  // Setup MCP routes (controller)
  const transports = setupMcpRoutes(app, context);

  // Catch-all error handler (last middleware)
  const catchAllErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  };
  app.use(catchAllErrorHandler);

  const httpServer = app.listen(port, host, () => {
    logger.log('SERVER_START', { port, host });
    const portStr = port.toString().padEnd(4, ' ');
    const recoveryStatus = wasClean ? '✅ clean' : `⚠ recovered ${orphanCount} orphans`;
    console.log(`┌───────────────────────────────────┐`);
    console.log(`│  MCP Server listening :${portStr}       │`);
    console.log(`│  Transport: Streamable HTTP       │`);
    console.log(`│  Endpoint: ${API_ROUTES.MCP.padEnd(23)}│`);
    console.log(`│  Health: ${API_ROUTES.HEALTH.padEnd(25)}│`);
    console.log(`│  Version: ${VERSION.padEnd(24)}│`);
    console.log(`└───────────────────────────────────┘`);
    console.log(`  Recovery: ${recoveryStatus}`);
  });

  const shutdown = async (signal: ShutdownSignalValue) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    // Stop plan watcher
    planWatcher.stop();
    
    if (process.env.AG_BRAIN_WATCHER !== 'false') {
      stopBrainWatcher();
    }

    // Clear all workers since server is dying
    workerRegistry.clearAll();

    // Run graceful shutdown (stop monitoring, checkpoint, marker)
    recoveryManager.runGracefulShutdown();

    for (const [sid, transport] of Object.entries(transports)) {
      try { await transport.close(); } catch(e) { /* ignore */ }
      delete transports[sid];
    }
    httpServer.close();
    process.exit(0);
  };

  SHUTDOWN_SIGNALS.forEach(signal => process.on(signal, () => shutdown(signal)));
}
