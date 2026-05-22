import path from 'path';
import type { AssignmentEnvelope, AssignmentPayload } from '../models/assignment.js';
import type { QueueTask, TaskQueue, TaskQueueStatus } from '../mcp-server/task-queue.js';
import type { StateManager } from '../mcp-server/state-manager.js';
import type { WorkerRegistry } from '../utils/worker-registry.js';
import { ModelSelector, type ModelProfile } from './model-selector.js';
import { WorkerProcessManager, type WorkerProcessOutcome } from './process-manager.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import { FILE_PREFIXES, RECOVERY_DEFAULTS, SERVER_PROFILES, SYSTEM_MESSAGE, TASK_STATUS } from '../constants.js';

const MAX_RESPAWNS = 3;
const LOOP_SLEEP_MS = 2000;
const OLLAMA_UNAVAILABLE_LOG_INTERVAL_MS = 10_000;

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
}

interface ActiveHarness {
  workerId: string;
  taskId: string;
  model: string;
  completionAccepted: boolean;
}

function resolveMaxConcurrentWorkers(configured?: number): number {
  const raw = configured ?? Number(process.env.ORCHESTRATOR_MAX_WORKERS || SERVER_PROFILES.HYBRID.maxConcurrentWorkers);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : SERVER_PROFILES.HYBRID.maxConcurrentWorkers;
}

export class TaskDispatchLoop {
  private running = false;
  private queue: TaskQueue;
  private stateManager: StateManager;
  private workerRegistry: WorkerRegistry;
  private modelSelector: ModelSelector;
  private processManager: WorkerProcessManager;
  private ollamaAdapter: OllamaAdapter;
  private serverUrl: string;
  private workspaceRoot: string;
  private allowedTools: string[];
  private workspaceId: string;
  private lastOllamaUnavailableLogAt = 0;
  private maxConcurrentWorkers: number;
  private maxTaskRetries: number;
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

    this.modelSelector = new ModelSelector();
    this.processManager = new WorkerProcessManager();
    this.ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_BASE_URL);
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

  public getActiveWorkers(): ReturnType<WorkerProcessManager['getActive']> {
    return this.processManager.getActive();
  }

  public killWorker(pid: number): void {
    this.processManager.kill(pid);
  }

  public acknowledgeHarnessCompletion(workerId: string, taskId: string): boolean {
    const activeHarness = this.activeHarnesses.get(workerId);
    if (!activeHarness || activeHarness.taskId !== taskId) {
      return false;
    }

    activeHarness.completionAccepted = true;
    return true;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const dispatched = await this.dispatchAvailableTasks();
        if (dispatched === 0) {
          await this.sleep(LOOP_SLEEP_MS);
        }
      } catch (err: any) {
        console.error(SYSTEM_MESSAGE.DISPATCH_ERROR(err.message));
        await this.sleep(LOOP_SLEEP_MS);
      }
    }
  }

  private async dispatchAvailableTasks(): Promise<number> {
    let dispatched = 0;

    while (this.running && this.getActiveWorkers().length < this.maxConcurrentWorkers) {
      const task = this.queue.getDispatchableTasks()[0] || null;
      if (!task) break;

      const ollamaAvailable = await this.ollamaAdapter.health();
      if (!ollamaAvailable) {
        this.logOllamaUnavailable();
        break;
      }

      await this.dispatchTask(task, this.queue.getStatus());
      dispatched++;
    }

    return dispatched;
  }

  private async dispatchTask(task: QueueTask, queueStatus: TaskQueueStatus): Promise<void> {
    let movedToActive = false;
    let workerId = 'dispatch-loop';

    try {
      this.stateManager.moveToActive(task.id);
      movedToActive = true;

      const activeTaskPath = path.join(this.stateManager.config.exchange.active, `${FILE_PREFIXES.TASK}${task.id}.json`);
      const taskFilePath = path.relative(this.workspaceRoot, activeTaskPath).replace(/\\/g, '/');
      if (taskFilePath.startsWith('..')) {
        throw new Error(`Active task path escapes workspace root: ${activeTaskPath}`);
      }

      if (Number((task as any).respawn_count || 0) >= MAX_RESPAWNS) {
        this.stateManager.moveToOutbox(task.id, {
          task_id: task.id,
          status: TASK_STATUS.BLOCKED,
          summary: `Task exceeded max respawns (${MAX_RESPAWNS}). Consider using a cloud model.`,
          worker_id: 'dispatch-loop',
          completed_at: new Date().toISOString(),
          blocked_reason: 'max_respawns_exceeded'
        } as any);
        this.stateManager.saveCheckpoint();
        console.warn(`[DispatchLoop] Task ${task.id} exceeded max respawns (${MAX_RESPAWNS}); marked blocked.`);
        return;
      }

      const profile = await this.modelSelector.selectProfile(task, queueStatus);
      const worker = this.workerRegistry.register(this.workspaceId);
      workerId = worker.id;

      const assignmentPayload = this.buildAssignmentPayload(task);
      const assignment = this.buildAssignment(workerId, task, assignmentPayload, profile);
      this.workerRegistry.assignTask(workerId, task.id, this.stateManager.taskRegistry);

      const handoverContext = typeof (task as any).handover_context === 'string' ? (task as any).handover_context : undefined;
      if (handoverContext) {
        console.log(`[DispatchLoop] Injected handover for task ${task.id} (respawn ${(task as any).respawn_count || 0}).`);
      }

      const payload = {
        workspace_id: this.workspaceId,
        worker_id: workerId,
        task_id: task.id,
        assignment,
        task_file_path: taskFilePath,
        tool_bundle: typeof (task as any).tool_bundle === 'string' ? (task as any).tool_bundle : 'generic-file',
        callback_url: `${this.serverUrl}/api/worker/complete`,
        target_files: Array.isArray((task as any).target_files) ? (task as any).target_files : [],
        skill_paths: Array.isArray((task as any).skill_paths) ? (task as any).skill_paths : [],
        context_paths: Array.isArray((task as any).context_paths) ? (task as any).context_paths : [],
        model: profile.model,
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
        completionAccepted: false
      };
      this.activeHarnesses.set(workerId, activeHarness);

      const spawned = this.processManager.spawn(payload);
      void this.monitorHarness(activeHarness, spawned.completion);
    } catch (err: any) {
      this.activeHarnesses.delete(workerId);
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

  private buildAssignment(
    workerId: string,
    task: QueueTask,
    assignmentPayload: AssignmentPayload,
    profile: ModelProfile
  ): AssignmentEnvelope {
    return {
      operation: 'assign_task',
      worker_id: workerId,
      task_id: task.id,
      workspace: assignmentPayload.workspace,
      payload: assignmentPayload,
      routing: {
        mode: profile.mode,
        model: profile.model,
        max_workers: profile.max_workers,
        estimated_vram_gb: profile.estimated_vram_gb,
      },
      assigned_at: new Date().toISOString(),
    };
  }

  private async monitorHarness(activeHarness: ActiveHarness, completion: Promise<WorkerProcessOutcome>): Promise<void> {
    try {
      const result = await completion;
      const latest = this.activeHarnesses.get(activeHarness.workerId);
      const completionAccepted = latest?.completionAccepted || activeHarness.completionAccepted;
      this.activeHarnesses.delete(activeHarness.workerId);

      if (completionAccepted) {
        if (result.type === 'exit' && result.code === 0) {
          console.log(SYSTEM_MESSAGE.DISPATCH_WORKER_SUCCESS(activeHarness.workerId, activeHarness.taskId));
        } else {
          const exitDetail = result.type === 'timeout' ? 'timeout' : `code ${result.code}`;
          console.warn(`[DispatchLoop] Harness ${activeHarness.workerId} ended with ${exitDetail} after accepted completion for task ${activeHarness.taskId}.`);
        }
        return;
      }

      this.handleMissingCompletionSignal(activeHarness, result);
    } catch (err: any) {
      console.error(SYSTEM_MESSAGE.DISPATCH_ERROR(err.message));
    } finally {
      await this.unloadModelIfUnused(activeHarness.model);
    }
  }

  private handleMissingCompletionSignal(activeHarness: ActiveHarness, result: WorkerProcessOutcome): void {
    if (result.type === 'timeout') {
      console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_TIMEOUT(activeHarness.workerId, activeHarness.taskId));
    } else if (result.code !== 0) {
      console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_EXITED(activeHarness.workerId, result.code, activeHarness.taskId));
    } else {
      console.warn(`[DispatchLoop] Worker ${activeHarness.workerId} exited without accepted completion callback. Requeuing task ${activeHarness.taskId}.`);
    }

    this.workerRegistry.clearAssignment(activeHarness.workerId, this.stateManager.taskRegistry);
    if (this.stateManager.isTaskInActive(activeHarness.taskId)) {
      this.requeueOrFailActiveTask(activeHarness.taskId, activeHarness.workerId, 'missing accepted harness completion signal');
    }
  }

  private requeueOrFailActiveTask(taskId: string, workerId: string, reason: string): void {
    const retryCount = this.stateManager.getTaskRetryCount(taskId);
    if (retryCount >= this.maxTaskRetries) {
      this.stateManager.moveToOutbox(taskId, {
        task_id: taskId,
        status: TASK_STATUS.FAILED,
        summary: `Harness attempt failed after ${retryCount} retries: ${reason}`,
        worker_id: workerId,
        completed_at: new Date().toISOString(),
        permanently_failed: true,
        retry_count: retryCount,
        error: reason
      } as any);
      this.stateManager.saveCheckpoint();
      console.warn(`[DispatchLoop] Task ${taskId} reached max retries (${this.maxTaskRetries}); marked failed.`);
      return;
    }

    const newRetryCount = this.stateManager.requeueWithRetry(taskId, this.workspaceRoot);
    this.stateManager.saveCheckpoint();
    console.warn(`[DispatchLoop] Requeued task ${taskId} after harness failure (${newRetryCount}/${this.maxTaskRetries}).`);
  }

  private async unloadModelIfUnused(model: string): Promise<void> {
    const modelStillActive = Array.from(this.activeHarnesses.values())
      .some(activeHarness => activeHarness.model === model);
    if (modelStillActive) return;

    try {
      const unloaded = await this.ollamaAdapter.unload(model);
      if (unloaded) {
        console.log(SYSTEM_MESSAGE.DISPATCH_MODEL_UNLOADED(model));
      }
    } catch (err: any) {
      console.warn(SYSTEM_MESSAGE.DISPATCH_MODEL_UNLOAD_FAILED(model, err.message));
    }
  }

  private logOllamaUnavailable(): void {
    const now = Date.now();
    if (now - this.lastOllamaUnavailableLogAt < OLLAMA_UNAVAILABLE_LOG_INTERVAL_MS) {
      return;
    }

    console.warn('[DispatchLoop] Ollama unavailable; waiting before dispatch.');
    this.lastOllamaUnavailableLogAt = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
