import path from 'path';
import express from 'express';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { setupMcpRoutes } from './transport.js';
import { SHUTDOWN_SIGNALS, API_ROUTES, VERSION, SYSTEM_MESSAGE, type ShutdownSignalValue } from '../constants.js';
import { StateManager } from './state-manager.js';
import { RecoveryManager } from './recovery.js';
import { PlanWatcher } from './plan-watcher.js';
import { workerRegistry } from '../utils/worker-registry.js';
import { Logger } from '../utils/logger.js';
import { bootstrapDirectories } from '../utils/bootstrap.js';
import type { AppConfig, ServerContext } from '../models/index.js';
import { WorkspaceRegistry } from '../utils/workspace-registry.js';

import { TaskDispatchLoop } from '../worker/dispatch-loop.js';
import { VramManager } from '../worker/vram-manager.js';
import { ModelSelector } from '../worker/model-selector.js';
import { WorkerProcessManager } from '../worker/process-manager.js';
import { OllamaAdapter } from '../worker/adapters/ollama-adapter.js';

export async function startServer(config: AppConfig): Promise<void> {
  const { port, host } = config.global.server;

  // Bootstrap: tạo toàn bộ thư mục cần thiết trước khi khởi tạo bất kỳ service nào
  const { created, failed, skipped } = bootstrapDirectories(config);
  if (failed.length > 0) {
    console.error(SYSTEM_MESSAGE.BOOTSTRAP_FAILED, failed);
    process.exit(1);
  }
  if (created.length > 0) {
    console.log(SYSTEM_MESSAGE.BOOTSTRAP_CREATED(created.length, skipped));
  } else {
    console.log(SYSTEM_MESSAGE.BOOTSTRAP_CLEAN);
  }

  const logger = new Logger(config.workspace.exchange.logs);

  // Initialize worker registry with config-derived path
  const registryFilePath = path.join(config.workspace.exchange.base, 'workers.json');
  workerRegistry.setRegistryPath(registryFilePath);

  // Cleanup disconnected workers from previous runs
  const cleanedWorkers = workerRegistry.cleanupDisconnected();
  if (cleanedWorkers > 0) {
    console.log(SYSTEM_MESSAGE.WORKERS_CLEANED(cleanedWorkers));
    logger.log('WORKERS_CLEANED', { count: cleanedWorkers });
  }

  // StateManager receives workspace config (workspace-scoped paths)
  const stateManager = new StateManager(logger, config.workspace);

  // Recovery manager — handles crash recovery + stale worker monitoring
  const recoveryManager = new RecoveryManager({
    stateManager,
    workerRegistry,
    logger,
    config
  });

  // Run startup recovery (replaces raw restoreFromFiles)
  const { wasClean, orphanCount } = recoveryManager.runStartupRecovery();

  // Plan watcher — auto-polls plan/pending/ directory
  const planWatcherIntervalMs = config.workspace.planWatcher?.intervalMs || 30_000;
  const workspaceRegistry = new WorkspaceRegistry(config.runtimeRoot);
  const planWatcher = new PlanWatcher({
    stateManager,
    logger,
    config,
    workspaceRegistry,
    intervalMs: planWatcherIntervalMs
  });
  planWatcher.start();

  // Pass workerRegistry via context for DI (tools.ts uses it from here)
  const context: ServerContext = { stateManager, workerRegistry, logger, config, recoveryManager, planWatcher };

  let dispatchLoop: TaskDispatchLoop | undefined;
  let vramManager: VramManager | undefined;
  let ollamaAdapter: OllamaAdapter | undefined;

  // HYBRID Startup
  if (config.profile === 'hybrid') {
    // 1. Initialize: OllamaClient, ModelSelector, WorkerProcessManager, VramManager, TaskDispatchLoop
    ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_BASE_URL);
    const modelSelector = new ModelSelector();
    const processManager = new WorkerProcessManager();
    vramManager = new VramManager(process.env.OLLAMA_BASE_URL);
    
    dispatchLoop = new TaskDispatchLoop({
      queue: stateManager.queue,
      stateManager,
      profile: config.profile,
      serverUrl: `http://127.0.0.1:${port}`, // Assume local server url
      workspaceRoot: config.workspace.workspaceRoot || config.runtimeRoot,
      allowedTools: ['*'] // default to all
    });

    // 2. Start dispatch loop
    dispatchLoop.start();

    // 3. Start VRAM monitoring
    vramManager.startMonitoring();
    console.log(SYSTEM_MESSAGE.HYBRID_ACTIVATED);
  }

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
      console.error(SYSTEM_MESSAGE.JSON_PARSE_ERROR(req.method, req.url), err.message);
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

  app.get(API_ROUTES.HEALTH, async (req: Request, res: Response) => {
    const healthData: any = {
      status: "ok",
      uptime: process.uptime(),
      version: VERSION,
      last_start_clean: wasClean,
      orphans_recovered: orphanCount,
      connected_workers: workerRegistry.getActiveWorkerCount(),
      plan_watcher: planWatcher.getStats()
    };

    if (config.profile === 'hybrid') {
      try {
        healthData.ollama_status = ollamaAdapter ? await ollamaAdapter.health() : false;
      } catch (e) {
        healthData.ollama_status = false;
      }
      healthData.vram = vramManager ? vramManager.checkVram() : null;
      
      if (dispatchLoop) {
        healthData.dispatch_loop = (dispatchLoop as any).running ? 'running' : 'stopped';
        const pm = (dispatchLoop as any).processManager;
        healthData.active_workers = pm ? pm.getActive().length : 0;
      }
    }

    res.json(healthData);
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
    const recoveryStatus = wasClean ? SYSTEM_MESSAGE.RECOVERY_CLEAN : SYSTEM_MESSAGE.RECOVERY_ORPHANS(orphanCount);
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
    console.log(SYSTEM_MESSAGE.SHUTDOWN_RECEIVED(signal));

    // Stop plan watcher
    planWatcher.stop();

    // Clear all workers since server is dying
    workerRegistry.clearAll();

    // HYBRID Graceful Shutdown
    if (config.profile === 'hybrid') {
      if (dispatchLoop) {
        // 1. Stop dispatch loop
        dispatchLoop.stop();

        // 2. Kill active workers
        const pm = (dispatchLoop as any).processManager;
        if (pm) {
          const active = pm.getActive();
          for (const worker of active) {
            console.log(`[Shutdown] Killing active worker ${worker.worker_id} (PID ${worker.pid})...`);
            pm.kill(worker.pid);
          }
        }
      }

      // 3. Unload all models from VRAM
      if (ollamaAdapter) {
        try {
          const psData = await ollamaAdapter.ps();
          if (psData && psData.models) {
            for (const m of psData.models) {
              await ollamaAdapter.unload(m.name);
              console.log(`[Shutdown] Unloaded model ${m.name} from VRAM.`);
            }
          }
        } catch (err: any) {
          console.warn(`[Shutdown] Failed to unload models: ${err.message}`);
        }
      }

      if (vramManager) {
        vramManager.stopMonitoring();
      }
    }

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
