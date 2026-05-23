import express from 'express';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { setupMcpRoutes } from './transport.js';
import { SHUTDOWN_SIGNALS, API_ROUTES, VERSION, SYSTEM_MESSAGE, TASK_STATUS, SERVER_RUNTIME_DEFAULTS, type ShutdownSignalValue } from '../constants.js';
import { StateManager } from './state-manager.js';
import { RecoveryManager } from './recovery.js';
import { PlanWatcher } from './plan-watcher.js';
import { workerRegistry } from '../utils/worker-registry.js';
import { Logger } from '../utils/logger.js';
import { bootstrapDirectories, bootstrapWorkspace } from '../utils/bootstrap.js';
import type { AppConfig } from '../models/index.js';
import type { ServerContext } from './context.js';
import { WorkspaceRegistry } from '../utils/workspace-registry.js';
import { ensureOllamaRunning } from '../utils/ollama-launcher.js';
import { getWorkerCurrentTaskId } from '../utils/identity-invariants.js';
import {
  CapacityStore,
  INFRA_RESOURCE_MONITOR_ENV,
  InfraVerifier,
  InfraResourceMonitor,
  resolveInfraResourceMonitorIntervalMs,
} from '../infra/index.js';
import { createInfraResourceTablePrinter } from '../visibility/index.js';
import { RUNTIME_TERMINAL_CALLBACK_STATUS, type RuntimeTerminalCallbackStatus } from '../runtime/index.js';

import { TaskDispatchLoop } from '../worker/dispatch-loop.js';
import { VramManager } from '../worker/vram-manager.js';
import { ModelSelector } from '../worker/model-selector.js';
import { OllamaAdapter } from '../worker/adapters/ollama-adapter.js';

const ONE_SHOT_IDLE_MS = Number(process.env.ORCHESTRATOR_ONESHOT_IDLE_MS || SERVER_RUNTIME_DEFAULTS.ONE_SHOT_IDLE_MS);

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

  // Register and bootstrap the primary workspace BEFORE any services start
  const primaryRegistry = new WorkspaceRegistry(config.runtimeRoot);
  const primaryWorkspace = primaryRegistry.register(config.workspace.workspaceRoot);
  const wsBoot = bootstrapWorkspace(primaryWorkspace.path, primaryWorkspace);
  if (wsBoot.failed.length > 0) {
    console.error(SYSTEM_MESSAGE.BOOTSTRAP_FAILED, wsBoot.failed);
    process.exit(1);
  }
  console.log(SYSTEM_MESSAGE.PRIMARY_WORKSPACE(primaryWorkspace.name, primaryWorkspace.id));
  console.log(SYSTEM_MESSAGE.WORKSPACE_PATH(primaryWorkspace.path));
  if (wsBoot.created.length > 0) {
    console.log(SYSTEM_MESSAGE.WORKSPACE_DIRS_CREATED(wsBoot.created.length, wsBoot.skipped));
  }

  const logger = new Logger(config.workspace.exchange.logs);

  // Initialize worker registry with config-derived path
  workerRegistry.setRegistryPath(config.workspace.registry.workers);

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
  const oneShotInitialTaskCount = stateManager.taskRegistry.getAll().length;

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

  // Ensure Ollama is running before initializing LLM components
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaReady = await ensureOllamaRunning(ollamaBaseUrl);
  if (!ollamaReady) {
    console.warn(SYSTEM_MESSAGE.OLLAMA_NOT_AVAILABLE);
  }

  // Initialize Hybrid components (always-on — IDE/default mode archived)
  const ollamaAdapter = new OllamaAdapter(ollamaBaseUrl);
  const modelSelector = new ModelSelector();
  const vramManager = new VramManager(ollamaBaseUrl);
  const capacityStore = new CapacityStore();
  const infraVerifier = new InfraVerifier({
    getVramStatus: () => {
      const status = vramManager.checkVram();
      return status
        ? { available: true, ...status }
        : { available: false };
    },
  });
  capacityStore.setVerifiedCapacity(infraVerifier.verify());
  
  const dispatchLoop = new TaskDispatchLoop({
    queue: stateManager.queue,
    stateManager,
    workerRegistry,
    serverUrl: `http://127.0.0.1:${port}`,
    workspaceRoot: config.workspace.workspaceRoot,
    allowedTools: ['*'],
    workspaceId: config.workspace.workspaceId,
    maxTaskRetries: config.global.recovery.maxTaskRetries,
    staleWorkerThresholdMs: config.global.recovery.staleWorkerThresholdMs,
    capacityStore,
  });
  recoveryManager.setRuntimeLivenessProbe(workerId => dispatchLoop.isRuntimeAlive(workerId));

  const resourceMonitor = new InfraResourceMonitor({
    getUptimeSeconds: () => process.uptime(),
    getDispatchLoopStatus: () => ((dispatchLoop as any).running ? 'running' : 'stopped'),
    getQueueStatus: () => stateManager.getStatus(),
    getActiveWorkers: () => dispatchLoop.getActiveWorkers().map(worker => ({
      worker_id: worker.worker_id,
      task_id: worker.task_id,
      pid: worker.pid,
      started_at: worker.started_at,
      runtime_id: (worker as any).runtime_id,
      lease_generation: (worker as any).lease_generation,
      model: (worker as any).model,
      backend: (worker as any).backend,
      ready: (worker as any).ready,
      phase: (worker as any).phase,
      message: (worker as any).message,
      current_tool: (worker as any).current_tool,
      current_file: (worker as any).current_file,
      tool_call_count: (worker as any).tool_call_count,
      context_usage: (worker as any).context_usage,
      activity_updated_at: (worker as any).activity_updated_at,
      visible_terminal: (worker as any).visible_terminal,
    })),
    getVramStatus: () => {
      const status = vramManager.checkVram();
      return status
        ? { available: true, ...status }
        : { available: false };
    },
    checkOllamaHealth: () => ollamaAdapter.health(),
    listOllamaModels: async () => {
      const psData = await ollamaAdapter.ps();
      return Array.isArray(psData?.models)
        ? psData.models
            .map((model: any) => typeof model?.name === 'string' ? model.name : '')
            .filter(Boolean)
        : [];
    },
    verifyCapacity: () => {
      const capacity = infraVerifier.verify();
      capacityStore.setVerifiedCapacity(capacity);
      return capacity;
    },
    getWarmModelCache: () => capacityStore.getWarmModelCache(),
  });

  // Start dispatch loop
  dispatchLoop.start();

  // Start resource monitoring
  vramManager.startMonitoring();
  const printResourceTable = createInfraResourceTablePrinter({
    workspaceRoot: config.workspace.workspaceRoot,
    title: `AO Manager ${primaryWorkspace.name}`,
  });
  resourceMonitor.start(
    resolveInfraResourceMonitorIntervalMs(process.env[INFRA_RESOURCE_MONITOR_ENV.TABLE_INTERVAL_MS]),
    snapshot => printResourceTable(snapshot)
  );
  console.log(SYSTEM_MESSAGE.HYBRID_ACTIVATED);

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

    try {
      healthData.ollama_status = await ollamaAdapter.health();
    } catch (e) {
      healthData.ollama_status = false;
    }
    healthData.vram = vramManager.checkVram();
    healthData.infra_resources = resourceMonitor.getLatest() ?? await resourceMonitor.collect();
    healthData.dispatch_loop = (dispatchLoop as any).running ? 'running' : 'stopped';
    healthData.active_workers = dispatchLoop.getActiveWorkers().length;

    res.json(healthData);
  });

  app.post('/api/worker/ready', (req: Request, res: Response) => {
    const { worker_id, task_id, runtime_id, lease_generation, ready } = req.body || {};

    if (
      typeof worker_id !== 'string' ||
      typeof task_id !== 'string' ||
      typeof runtime_id !== 'string' ||
      typeof lease_generation !== 'number' ||
      typeof ready !== 'boolean'
    ) {
      res.status(400).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_INVALID_PAYLOAD });
      return;
    }

    const worker = workerRegistry.getWorker(worker_id);
    if (!worker) {
      res.status(404).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_UNKNOWN_WORKER(worker_id) });
      return;
    }

    if (getWorkerCurrentTaskId(worker) !== task_id) {
      res.status(409).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_NOT_ASSIGNED(worker_id, task_id) });
      return;
    }

    const runtimeIdentity = { runtime_id, worker_id, task_id, lease_generation };
    if (!dispatchLoop.acknowledgeHarnessReady(worker_id, task_id, runtimeIdentity, ready)) {
      res.status(409).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_LEASE_MISMATCH(worker_id, task_id, runtime_id, lease_generation) });
      return;
    }

    res.json({ accepted: true });
  });

  app.post('/api/worker/progress', (req: Request, res: Response) => {
    const { worker_id, task_id, runtime_id, lease_generation, phase, message, details } = req.body || {};

    if (
      typeof worker_id !== 'string' ||
      typeof task_id !== 'string' ||
      typeof runtime_id !== 'string' ||
      typeof lease_generation !== 'number'
    ) {
      res.status(400).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_INVALID_PAYLOAD });
      return;
    }

    const runtimeIdentity = { runtime_id, worker_id, task_id, lease_generation };
    if (!dispatchLoop.recordHarnessProgress(
      worker_id,
      task_id,
      runtimeIdentity,
      typeof phase === 'string' ? phase : undefined,
      typeof message === 'string' ? message : undefined,
      details && typeof details === 'object' && !Array.isArray(details) ? details : undefined
    )) {
      res.status(409).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_LEASE_MISMATCH(worker_id, task_id, runtime_id, lease_generation) });
      return;
    }

    res.json({ accepted: true });
  });

  app.post('/api/worker/complete', (req: Request, res: Response) => {
    const { worker_id, task_id, runtime_id, lease_generation, status, summary, success, error_context, changelog } = req.body || {};

    if (
      typeof worker_id !== 'string' ||
      typeof task_id !== 'string' ||
      typeof runtime_id !== 'string' ||
      typeof lease_generation !== 'number' ||
      typeof summary !== 'string' ||
      typeof success !== 'boolean'
    ) {
      res.status(400).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_INVALID_PAYLOAD });
      return;
    }

    const terminalStatus = resolveTerminalCallbackStatus(status, success, error_context);

    const worker = workerRegistry.getWorker(worker_id);
    if (!worker) {
      res.status(404).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_UNKNOWN_WORKER(worker_id) });
      return;
    }

    if (getWorkerCurrentTaskId(worker) !== task_id) {
      res.status(409).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_NOT_ASSIGNED(worker_id, task_id) });
      return;
    }

    const runtimeIdentity = {
      runtime_id,
      worker_id,
      task_id,
      lease_generation,
    };

    dispatchLoop.setHarnessTerminalStatus(runtimeIdentity, terminalStatus);
    if (!dispatchLoop.acknowledgeHarnessCompletion(worker_id, task_id, runtimeIdentity)) {
      res.status(409).json({ accepted: false, error: SYSTEM_MESSAGE.WORKER_COMPLETE_LEASE_MISMATCH(worker_id, task_id, runtime_id, lease_generation) });
      return;
    }

    console.log(SYSTEM_MESSAGE.WORKER_COMPLETE_RECEIVED(
      success ? SYSTEM_MESSAGE.WORKER_COMPLETE_STATUS_SUCCESS : SYSTEM_MESSAGE.WORKER_COMPLETE_STATUS_FAILURE,
      worker_id,
      task_id,
      summary
    ));

    try {
      if (
        terminalStatus === RUNTIME_TERMINAL_CALLBACK_STATUS.HANDOVER_REQUIRED &&
        error_context?.handover &&
        typeof error_context.handover === 'object' &&
        !Array.isArray(error_context.handover)
      ) {
        const respawnCount = stateManager.requeueWithHandover(task_id, error_context.handover, config.workspace.workspaceRoot);
        workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
        stateManager.saveCheckpoint();
        console.log(SYSTEM_MESSAGE.WORKER_COMPLETE_HANDOVER_REQUEUED(task_id, respawnCount));
        res.json({ accepted: true, action: 'requeued_with_handover', respawn_count: respawnCount });
        return;
      }

      if (success) {
        stateManager.moveToOutbox(task_id, {
          task_id,
          status: 'done',
          summary,
          worker_id,
          completed_at: new Date().toISOString(),
          changelog
        } as any);
        worker.tasks_completed++;
      } else if (summary === 'scope_violation') {
        stateManager.moveToOutbox(task_id, {
          task_id,
          status: 'blocked',
          summary,
          worker_id,
          completed_at: new Date().toISOString(),
          blocked_reason: error_context?.error || 'Worker attempted to write outside declared target_files.'
        } as any);
      } else {
        const retryCount = stateManager.getTaskRetryCount(task_id);
        const maxTaskRetries = config.global.recovery.maxTaskRetries;
        if (retryCount >= maxTaskRetries) {
          stateManager.moveToOutbox(task_id, {
            task_id,
            status: TASK_STATUS.FAILED,
            summary,
            worker_id,
            completed_at: new Date().toISOString(),
            permanently_failed: true,
            retry_count: retryCount,
            error_context
          } as any);
        } else {
          stateManager.requeueWithRetry(task_id, config.workspace.workspaceRoot);
        }
      }

      workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
      stateManager.saveCheckpoint();
      res.json({ accepted: true });
    } catch (err: any) {
      dispatchLoop.rollbackHarnessCompletion(runtimeIdentity);
      workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
      res.status(500).json({ accepted: false, error: err.message });
    }
  });

  function resolveTerminalCallbackStatus(status: unknown, success: boolean, errorContext: any): RuntimeTerminalCallbackStatus {
    if (typeof status === 'string' && Object.values(RUNTIME_TERMINAL_CALLBACK_STATUS).includes(status as RuntimeTerminalCallbackStatus)) {
      return status as RuntimeTerminalCallbackStatus;
    }
    if (!success && errorContext?.error === 'context_exceeded') {
      return RUNTIME_TERMINAL_CALLBACK_STATUS.HANDOVER_REQUIRED;
    }
    return success ? RUNTIME_TERMINAL_CALLBACK_STATUS.COMPLETE : RUNTIME_TERMINAL_CALLBACK_STATUS.FAILED;
  }

  // Setup MCP routes (controller)
  const transports = setupMcpRoutes(app, context);

  // Catch-all error handler (last middleware)
  const catchAllErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(SYSTEM_MESSAGE.SERVER_UNHANDLED_ERROR, err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: SYSTEM_MESSAGE.SERVER_INTERNAL_ERROR },
        id: null
      });
    }
  };
  app.use(catchAllErrorHandler);

  const httpServer = app.listen(port, host, () => {
    logger.log('SERVER_START', { port, host });
    const portStr = port.toString().padEnd(4, ' ');
    const recoveryStatus = wasClean ? SYSTEM_MESSAGE.RECOVERY_CLEAN : SYSTEM_MESSAGE.RECOVERY_ORPHANS(orphanCount);
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_TOP);
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_LISTENING(portStr));
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_TRANSPORT);
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_ENDPOINT(API_ROUTES.MCP));
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_HEALTH(API_ROUTES.HEALTH));
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_VERSION(VERSION));
    console.log(SYSTEM_MESSAGE.SERVER_BANNER_BOTTOM);
    console.log(SYSTEM_MESSAGE.SERVER_RECOVERY_STATUS(recoveryStatus));
  });

  const shutdown = async (signal: ShutdownSignalValue) => {
    console.log(SYSTEM_MESSAGE.SHUTDOWN_RECEIVED(signal));

    // Stop plan watcher
    planWatcher.stop();

    // Clear all workers since server is dying
    workerRegistry.clearAll();

    // Graceful Shutdown: stop dispatch, kill workers, unload models
    dispatchLoop.stop();

    const activeWorkers = dispatchLoop.getActiveWorkers();
    for (const worker of activeWorkers) {
      console.log(SYSTEM_MESSAGE.SHUTDOWN_KILLING_WORKER(worker.worker_id, worker.pid));
      dispatchLoop.killWorker(worker.pid);
    }

    try {
      const psData = await ollamaAdapter.ps();
      if (psData && psData.models) {
        for (const m of psData.models) {
          await ollamaAdapter.unload(m.name);
          console.log(SYSTEM_MESSAGE.SHUTDOWN_UNLOADED_MODEL(m.name));
        }
      }
    } catch (err: any) {
      console.warn(SYSTEM_MESSAGE.SHUTDOWN_UNLOAD_FAILED(err.message));
    }

    vramManager.stopMonitoring();
    resourceMonitor.stop();

    // Run graceful shutdown (stop monitoring, checkpoint, marker)
    recoveryManager.runGracefulShutdown();

    for (const [sid, transport] of Object.entries(transports)) {
      try { await transport.close(); } catch(e) { /* ignore */ }
      delete transports[sid];
    }
    httpServer.close();
    process.exit(0);
  };

  if (process.env.ORCHESTRATOR_ONESHOT === '1') {
    let sawTask = stateManager.getStatus().total > 0;
    let idleSince: number | null = null;

    console.log(SYSTEM_MESSAGE.ONE_SHOT_ENABLED(ONE_SHOT_IDLE_MS));

    const oneShotTimer = setInterval(() => {
      const queueStatus = stateManager.getStatus();
      const registryCount = stateManager.taskRegistry.getAll().length;
      const activeWorkerCount = dispatchLoop.getActiveWorkers().length;

      if (!sawTask && (queueStatus.total > 0 || registryCount > oneShotInitialTaskCount)) {
        sawTask = true;
      }

      const hasActiveQueueWork = queueStatus.pending > 0 || queueStatus.active > 0;
      const isDrained = sawTask && !hasActiveQueueWork && activeWorkerCount === 0;

      if (!isDrained) {
        idleSince = null;
        return;
      }

      idleSince ??= Date.now();
      if (Date.now() - idleSince >= ONE_SHOT_IDLE_MS) {
        clearInterval(oneShotTimer);
        void shutdown('SIGTERM');
      }
    }, 500);
    oneShotTimer.unref();
  }

  SHUTDOWN_SIGNALS.forEach(signal => process.on(signal, () => shutdown(signal)));
}
