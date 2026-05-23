import path from 'path';
import type { AssignmentEnvelope, AssignmentPayload } from '../scheduler/index.js';
import type { QueueTask, TaskQueue, TaskQueueStatus } from '../mcp-server/task-queue.js';
import type { StateManager } from '../mcp-server/state-manager.js';
import type { WorkerRegistry } from '../utils/worker-registry.js';
import { ModelSelector, type ModelProfile } from './model-selector.js';
import type { WorkerProcessOutcome } from './process-manager.js';
import { FILE_PREFIXES, RECOVERY_DEFAULTS, SERVER_PROFILES, SYSTEM_MESSAGE, TASK_STATUS } from '../constants.js';
import type { CapacityStore } from '../infra/index.js';
import {
  RUNTIME_BACKEND,
  RUNTIME_ISOLATION,
  RUNTIME_LEASE_STATUS,
  RUNTIME_TERMINAL_CALLBACK_STATUS,
  LeaseValidator,
  RuntimeManager,
  type RuntimeIdentity,
  type RuntimeLeaseStatus,
  type RuntimeTerminalCallbackStatus,
} from '../runtime/index.js';
import { isSharedOllamaDevFallback, OLLAMA_RUNTIME_DEFAULTS } from '../runtime-adapters/ollama/index.js';
import { DISPATCH_LOOP_DEFAULTS, DISPATCH_LOOP_TEXT } from '../scheduler/index.js';

export interface DispatchLoopConfig {
  queue: TaskQueue;
  stateManager: StateManager;
  workerRegistry: WorkerRegistry;
  serverUrl: string;
  workspaceRoot: string;
  allowedTools: string[];
  workspaceId: string;
  maxConcurrentWorkers?: number;
  maxTaskRetries?: number;
  staleWorkerThresholdMs?: number;
  capacityStore?: CapacityStore;
}

interface ActiveHarness {
  workerId: string;
  taskId: string;
  model: string;
  runtimeIdentity: RuntimeIdentity;
  completionAccepted: boolean;
  readyAccepted: boolean;
  terminalStatus?: RuntimeTerminalCallbackStatus;
}

function resolveMaxConcurrentWorkers(configured?: number): number {
  const raw = configured ?? Number(process.env.ORCHESTRATOR_MAX_WORKERS || SERVER_PROFILES.HYBRID.maxConcurrentWorkers);
  const resolved = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : SERVER_PROFILES.HYBRID.maxConcurrentWorkers;
  return isSharedOllamaDevFallback()
    ? Math.min(resolved, OLLAMA_RUNTIME_DEFAULTS.SHARED_FALLBACK_MAX_WORKERS)
    : resolved;
}

export class TaskDispatchLoop {
  private running = false;
  private queue: TaskQueue;
  private stateManager: StateManager;
  private workerRegistry: WorkerRegistry;
  private modelSelector: ModelSelector;
  private runtimeManager: RuntimeManager;
  private serverUrl: string;
  private workspaceRoot: string;
  private allowedTools: string[];
  private workspaceId: string;
  private lastOllamaUnavailableLogAt = 0;
  private maxConcurrentWorkers: number;
  private maxTaskRetries: number;
  private staleWorkerThresholdMs: number;
  private activeHarnesses = new Map<string, ActiveHarness>();

  constructor(config: DispatchLoopConfig) {
    this.queue = config.queue;
    this.stateManager = config.stateManager;
    this.workerRegistry = config.workerRegistry;
    this.serverUrl = config.serverUrl;
    this.workspaceRoot = config.workspaceRoot;
    this.allowedTools = config.allowedTools;
    this.workspaceId = config.workspaceId;
    this.maxConcurrentWorkers = resolveMaxConcurrentWorkers(config.maxConcurrentWorkers);
    this.maxTaskRetries = config.maxTaskRetries ?? RECOVERY_DEFAULTS.MAX_TASK_RETRIES;
    this.staleWorkerThresholdMs = config.staleWorkerThresholdMs ?? RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS;

    this.modelSelector = new ModelSelector(config.capacityStore);
    this.runtimeManager = new RuntimeManager({
      staleWorkerThresholdMs: this.staleWorkerThresholdMs,
      workspaceRoot: this.workspaceRoot,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
      capacityStore: config.capacityStore,
    });
    this.runtimeManager.on('runtime:heartbeat', ({ worker_id }) => {
      this.workerRegistry.updateHeartbeat(worker_id);
    });
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    console.log(SYSTEM_MESSAGE.DISPATCH_STARTING);
    void this.loop();
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    console.log(SYSTEM_MESSAGE.DISPATCH_STOPPING);
  }

  public getActiveWorkers(): ReturnType<RuntimeManager['getActiveWorkers']> {
    return this.runtimeManager.getActiveWorkers();
  }

  public isRuntimeAlive(workerId: string): boolean {
    return this.runtimeManager.isAlive(workerId);
  }

  public killWorker(pid: number): void {
    this.runtimeManager.kill(pid);
  }

  public acknowledgeHarnessCompletion(workerId: string, taskId: string, runtimeIdentity: RuntimeIdentity): boolean {
    const activeHarness = this.activeHarnesses.get(runtimeIdentity.runtime_id);
    if (!activeHarness || activeHarness.taskId !== taskId) {
      return false;
    }
    if (activeHarness.workerId !== workerId || activeHarness.completionAccepted) {
      return false;
    }
    if (!LeaseValidator.identityMatches(activeHarness.runtimeIdentity, runtimeIdentity)) {
      return false;
    }

    if (!this.runtimeManager.acceptTerminalCallback(runtimeIdentity, activeHarness.terminalStatus ?? RUNTIME_TERMINAL_CALLBACK_STATUS.COMPLETE)) {
      return false;
    }
    activeHarness.completionAccepted = true;
    return true;
  }

  public acknowledgeHarnessReady(workerId: string, taskId: string, runtimeIdentity: RuntimeIdentity, ready: boolean): boolean {
    const activeHarness = this.activeHarnesses.get(runtimeIdentity.runtime_id);
    if (!activeHarness || activeHarness.workerId !== workerId || activeHarness.taskId !== taskId) {
      return false;
    }
    if (!LeaseValidator.identityMatches(activeHarness.runtimeIdentity, runtimeIdentity)) {
      return false;
    }
    if (!ready) return false;
    activeHarness.readyAccepted = true;
    this.runtimeManager.markReady(runtimeIdentity);
    this.runtimeManager.markRunning(runtimeIdentity);
    return true;
  }

  public recordHarnessProgress(workerId: string, taskId: string, runtimeIdentity: RuntimeIdentity): boolean {
    const activeHarness = this.activeHarnesses.get(runtimeIdentity.runtime_id);
    return Boolean(
      activeHarness &&
      activeHarness.workerId === workerId &&
      activeHarness.taskId === taskId &&
      LeaseValidator.identityMatches(activeHarness.runtimeIdentity, runtimeIdentity)
    );
  }

  public setHarnessTerminalStatus(runtimeIdentity: RuntimeIdentity, status: RuntimeTerminalCallbackStatus): void {
    const activeHarness = this.activeHarnesses.get(runtimeIdentity.runtime_id);
    if (activeHarness) activeHarness.terminalStatus = status;
  }

  public rollbackHarnessCompletion(runtimeIdentity: RuntimeIdentity): void {
    const activeHarness = this.activeHarnesses.get(runtimeIdentity.runtime_id);
    if (!activeHarness) return;
    activeHarness.completionAccepted = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const dispatched = await this.dispatchAvailableTasks();
        if (dispatched === 0) {
          await this.sleep(DISPATCH_LOOP_DEFAULTS.LOOP_SLEEP_MS);
        }
      } catch (err: any) {
        console.error(SYSTEM_MESSAGE.DISPATCH_ERROR(err.message));
        await this.sleep(DISPATCH_LOOP_DEFAULTS.LOOP_SLEEP_MS);
      }
    }
  }

  private async dispatchAvailableTasks(): Promise<number> {
    let dispatched = 0;

    while (this.running && this.getActiveWorkers().length < this.maxConcurrentWorkers) {
      const task = this.queue.getDispatchableTasks()[0] || null;
      if (!task) break;

      await this.dispatchTask(task, this.queue.getStatus());
      dispatched++;
    }

    return dispatched;
  }

  private async dispatchTask(task: QueueTask, queueStatus: TaskQueueStatus): Promise<void> {
    let movedToActive = false;
    let workerId = 'dispatch-loop';
    let runtimeIdentity: RuntimeIdentity | null = null;

    try {
      console.log(DISPATCH_LOOP_TEXT.DISPATCHING(task.id));
      this.stateManager.moveToActive(task.id);
      movedToActive = true;

      const activeTaskPath = path.join(this.stateManager.config.exchange.active, `${FILE_PREFIXES.TASK}${task.id}.json`);
      const taskFilePath = path.relative(this.workspaceRoot, activeTaskPath).replace(/\\/g, '/');
      if (taskFilePath.startsWith('..')) {
        throw new Error(DISPATCH_LOOP_TEXT.ACTIVE_TASK_PATH_ESCAPES(activeTaskPath));
      }

      if (Number((task as any).respawn_count || 0) >= DISPATCH_LOOP_DEFAULTS.MAX_RESPAWNS) {
        this.stateManager.moveToOutbox(task.id, {
          task_id: task.id,
          status: TASK_STATUS.BLOCKED,
          summary: DISPATCH_LOOP_TEXT.MAX_RESPAWNS_SUMMARY(DISPATCH_LOOP_DEFAULTS.MAX_RESPAWNS),
          worker_id: 'dispatch-loop',
          completed_at: new Date().toISOString(),
          blocked_reason: DISPATCH_LOOP_TEXT.MAX_RESPAWNS_BLOCKED_REASON
        } as any);
        this.stateManager.saveCheckpoint();
        console.warn(DISPATCH_LOOP_TEXT.MAX_RESPAWNS_MARKED(task.id, DISPATCH_LOOP_DEFAULTS.MAX_RESPAWNS));
        return;
      }

      const profile = await this.modelSelector.selectProfile(task, queueStatus);
      console.log(DISPATCH_LOOP_TEXT.SELECTED_MODEL(profile.model, profile.mode, task.id));
      const worker = this.workerRegistry.register(this.workspaceId);
      workerId = worker.id;
      const leaseGeneration = this.getLeaseGeneration(task);
      runtimeIdentity = {
        runtime_id: `${workerId}:${task.id}:${leaseGeneration}`,
        worker_id: workerId,
        task_id: task.id,
        lease_generation: leaseGeneration,
      };
      const runtimeBackend = {
        backend: profile.backend,
        model: profile.model,
        command: profile.command,
        args: profile.args,
        endpoint_url: process.env.OLLAMA_BASE_URL,
      };
      const backendAvailable = await this.runtimeManager.isBackendHealthy(runtimeBackend);
      if (!backendAvailable) {
        this.logBackendUnavailable(profile.backend);
        this.requeueOrFailActiveTask(task.id, workerId, `backend unavailable: ${profile.backend}`);
        return;
      }
      const runtimeIsolation = {
        mode: profile.backend === RUNTIME_BACKEND.OLLAMA ? RUNTIME_ISOLATION.SHARED_DEV : RUNTIME_ISOLATION.CLI_SESSION,
        workspace_root: this.workspaceRoot,
      };

      const assignmentPayload = this.buildAssignmentPayload(task);
      const assignment = this.buildAssignment(workerId, task, runtimeIdentity, assignmentPayload, profile);
      this.workerRegistry.assignTask(workerId, task.id, this.stateManager.taskRegistry);

      const handoverContext = (task as any).handover_context &&
        (typeof (task as any).handover_context === 'string' || typeof (task as any).handover_context === 'object')
        ? (task as any).handover_context
        : undefined;
      if (handoverContext) {
        console.log(DISPATCH_LOOP_TEXT.INJECTED_HANDOVER(task.id, Number((task as any).respawn_count || 0)));
      }

      const payload = {
        workspace_id: this.workspaceId,
        worker_id: workerId,
        task_id: task.id,
        runtime_id: runtimeIdentity.runtime_id,
        lease_generation: runtimeIdentity.lease_generation,
        runtime_identity: runtimeIdentity,
        backend: {
          ...runtimeBackend,
        },
        assignment,
        task_file_path: taskFilePath,
        tool_bundle: typeof (task as any).tool_bundle === 'string' ? (task as any).tool_bundle : 'generic-file',
        callback_url: `${this.serverUrl}/api/worker/complete`,
        ready_url: `${this.serverUrl}/api/worker/ready`,
        progress_url: `${this.serverUrl}/api/worker/progress`,
        target_files: Array.isArray((task as any).target_files) ? (task as any).target_files : [],
        skill_paths: Array.isArray((task as any).skill_paths) ? (task as any).skill_paths : [],
        context_paths: Array.isArray((task as any).context_paths) ? (task as any).context_paths : [],
        model: profile.model,
        context_threshold: 0.8,
        warm_cache_policy: {
          ttl_ms: 10 * 60 * 1000,
          retain_on_release: true,
          evict_on_pressure: true,
        },
        workspace_root: this.workspaceRoot,
        allowed_tools: this.allowedTools,
        action: 'implement',
        module: typeof task.module === 'string' ? task.module : '',
        handover_context: handoverContext
      };

      const activeHarness: ActiveHarness = {
        workerId,
        taskId: task.id,
        model: profile.model,
        runtimeIdentity,
        completionAccepted: false,
        readyAccepted: false,
      };
      this.activeHarnesses.set(runtimeIdentity.runtime_id, activeHarness);

      const spawned = await this.runtimeManager.spawn({
        worker_id: workerId,
        task_id: task.id,
        lease_generation: leaseGeneration,
        backend: runtimeBackend,
        isolation: runtimeIsolation,
        reserved_points: profile.points_required,
        capacity_request: {
          worker_slots: 1,
          estimated_vram_mb: profile.backend === RUNTIME_BACKEND.OLLAMA ? Math.round(profile.estimated_vram_gb * 1024) : undefined,
        },
        payload,
      });
      runtimeIdentity = spawned.runtimeIdentity;
      this.activeHarnesses.delete(activeHarness.runtimeIdentity.runtime_id);
      activeHarness.runtimeIdentity = spawned.runtimeIdentity;
      this.activeHarnesses.set(spawned.runtimeIdentity.runtime_id, activeHarness);
      console.log(DISPATCH_LOOP_TEXT.MONITORING_HARNESS(workerId, task.id));
      void this.monitorHarness(activeHarness, spawned.completion);
    } catch (err: any) {
      if (runtimeIdentity) {
        await this.releaseRuntimeLease(runtimeIdentity, RUNTIME_LEASE_STATUS.FAILED);
      }
      if (runtimeIdentity) this.activeHarnesses.delete(runtimeIdentity.runtime_id);
      this.workerRegistry.clearAssignment(workerId, this.stateManager.taskRegistry);
      if (movedToActive && this.stateManager.isTaskInActive(task.id)) {
        this.requeueOrFailActiveTask(task.id, workerId, `dispatch failed: ${err.message}`);
      }
      throw err;
    }
  }

  private buildAssignmentPayload(task: QueueTask): AssignmentPayload {
    return {
      task_id: task.id,
      module: task.module,
      action: task.action,
      verification: task.verification,
      workspace: {
        workspace_id: this.workspaceId,
        workspace_path: this.workspaceRoot,
        exchange_root: this.stateManager.config.exchange.base,
        plan_root: this.stateManager.config.plans.base,
      },
      done_criteria: Array.isArray((task as any).done_criteria) ? (task as any).done_criteria : [],
      metadata: {
        target_files: Array.isArray((task as any).target_files) ? (task as any).target_files : [],
        read_files: Array.isArray((task as any).read_files) ? (task as any).read_files : [],
        skill_paths: Array.isArray((task as any).skill_paths) ? (task as any).skill_paths : [],
        context_paths: Array.isArray((task as any).context_paths) ? (task as any).context_paths : [],
        tool_bundle: typeof (task as any).tool_bundle === 'string' ? (task as any).tool_bundle : 'generic-file',
        task_content_path: typeof (task as any).task_content_path === 'string' ? (task as any).task_content_path : '',
      }
    };
  }

  private getLeaseGeneration(task: QueueTask): number {
    const retryGeneration = Number((task as any).retry_count || 0);
    const respawnGeneration = Number((task as any).respawn_count || 0);
    return Math.max(retryGeneration, respawnGeneration) + 1;
  }

  private buildAssignment(
    workerId: string,
    task: QueueTask,
    runtimeIdentity: RuntimeIdentity,
    assignmentPayload: AssignmentPayload,
    profile: ModelProfile
  ): AssignmentEnvelope {
    return {
      operation: 'assign_task',
      worker_id: workerId,
      task_id: task.id,
      runtime_identity: runtimeIdentity,
      workspace: assignmentPayload.workspace,
      payload: assignmentPayload,
      routing: {
        mode: profile.mode,
        model: profile.model,
        backend: profile.backend,
        max_workers: profile.max_workers,
        estimated_vram_gb: profile.estimated_vram_gb,
      },
      assigned_at: new Date().toISOString(),
    };
  }

  private async monitorHarness(activeHarness: ActiveHarness, completion: Promise<WorkerProcessOutcome>): Promise<void> {
    try {
      const result = await completion;
      const latest = this.activeHarnesses.get(activeHarness.runtimeIdentity.runtime_id);
      const completionAccepted = latest?.completionAccepted || activeHarness.completionAccepted;
      this.activeHarnesses.delete(activeHarness.runtimeIdentity.runtime_id);

      if (completionAccepted) {
        if (result.type === 'exit' && result.code === 0) {
          console.log(SYSTEM_MESSAGE.DISPATCH_WORKER_SUCCESS(activeHarness.workerId, activeHarness.taskId));
        } else {
          const exitDetail = result.type === 'timeout'
            ? DISPATCH_LOOP_TEXT.EXIT_DETAIL_TIMEOUT
            : DISPATCH_LOOP_TEXT.EXIT_DETAIL_CODE(result.code);
          console.warn(DISPATCH_LOOP_TEXT.ACCEPTED_BUT_EXITED(activeHarness.workerId, exitDetail, activeHarness.taskId));
        }
        return;
      }

      this.handleMissingCompletionSignal(activeHarness, result);
    } catch (err: any) {
      console.error(SYSTEM_MESSAGE.DISPATCH_ERROR(err.message));
    } finally {
      await this.releaseRuntimeLease(activeHarness.runtimeIdentity);
    }
  }

  private async releaseRuntimeLease(identity: RuntimeIdentity, status: RuntimeLeaseStatus = RUNTIME_LEASE_STATUS.RELEASED): Promise<void> {
    await this.runtimeManager.release(identity, status);
  }

  private handleMissingCompletionSignal(activeHarness: ActiveHarness, result: WorkerProcessOutcome): void {
    if (result.type === 'timeout') {
      console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_TIMEOUT(activeHarness.workerId, activeHarness.taskId));
    } else if (result.code !== 0) {
      console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_EXITED(activeHarness.workerId, result.code, activeHarness.taskId));
    } else {
      console.warn(DISPATCH_LOOP_TEXT.MISSING_COMPLETION(activeHarness.workerId, activeHarness.taskId));
    }

    this.workerRegistry.clearAssignment(activeHarness.workerId, this.stateManager.taskRegistry);
    if (this.stateManager.isTaskInActive(activeHarness.taskId)) {
      this.requeueOrFailActiveTask(activeHarness.taskId, activeHarness.workerId, DISPATCH_LOOP_TEXT.MISSING_COMPLETION_REASON);
    }
  }

  private requeueOrFailActiveTask(taskId: string, workerId: string, reason: string): void {
    const retryCount = this.stateManager.getTaskRetryCount(taskId);
    if (retryCount >= this.maxTaskRetries) {
      this.stateManager.moveToOutbox(taskId, {
        task_id: taskId,
        status: TASK_STATUS.FAILED,
        summary: DISPATCH_LOOP_TEXT.RETRY_FAILED_SUMMARY(retryCount, reason),
        worker_id: workerId,
        completed_at: new Date().toISOString(),
        permanently_failed: true,
        retry_count: retryCount,
        error: reason
      } as any);
      this.stateManager.saveCheckpoint();
      console.warn(DISPATCH_LOOP_TEXT.MAX_RETRIES_MARKED(taskId, this.maxTaskRetries));
      return;
    }

    const newRetryCount = this.stateManager.requeueWithRetry(taskId, this.workspaceRoot);
    this.stateManager.saveCheckpoint();
    console.warn(DISPATCH_LOOP_TEXT.REQUEUED_AFTER_FAILURE(taskId, newRetryCount, this.maxTaskRetries));
  }

  private logOllamaUnavailable(): void {
    const now = Date.now();
    if (now - this.lastOllamaUnavailableLogAt < DISPATCH_LOOP_DEFAULTS.OLLAMA_UNAVAILABLE_LOG_INTERVAL_MS) {
      return;
    }

    console.warn(DISPATCH_LOOP_TEXT.OLLAMA_UNAVAILABLE);
    this.lastOllamaUnavailableLogAt = now;
  }

  private logBackendUnavailable(backend: string): void {
    if (backend === RUNTIME_BACKEND.OLLAMA) {
      this.logOllamaUnavailable();
      return;
    }
    console.warn(`[DispatchLoop] Backend unavailable: ${backend}.`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
