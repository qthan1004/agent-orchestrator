import type { AssignmentEnvelope, AssignmentPayload } from '../models/assignment.js';
import type { TaskQueue } from '../mcp-server/task-queue.js';
import type { StateManager } from '../mcp-server/state-manager.js';
import type { WorkerRegistry } from '../utils/worker-registry.js';
import { ModelSelector } from './model-selector.js';
import { WorkerProcessManager } from './process-manager.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import { SYSTEM_MESSAGE } from '../constants.js';

export interface DispatchLoopConfig {
  queue: TaskQueue;
  stateManager: StateManager;
  workerRegistry: WorkerRegistry;
  profile: 'default' | 'hybrid';
  serverUrl: string;
  workspaceRoot: string;
  allowedTools: string[];
  workspaceId: string;
}

export class TaskDispatchLoop {
  private running = false;
  private queue: TaskQueue;
  private stateManager: StateManager;
  private workerRegistry: WorkerRegistry;
  private modelSelector: ModelSelector;
  private processManager: WorkerProcessManager;
  private ollamaAdapter: OllamaAdapter;
  private profile: 'default' | 'hybrid';
  private serverUrl: string;
  private workspaceRoot: string;
  private allowedTools: string[];
  private workspaceId: string;

  constructor(config: DispatchLoopConfig) {
    this.queue = config.queue;
    this.stateManager = config.stateManager;
    this.workerRegistry = config.workerRegistry;
    this.profile = config.profile;
    this.serverUrl = config.serverUrl;
    this.workspaceRoot = config.workspaceRoot;
    this.allowedTools = config.allowedTools;
    this.workspaceId = config.workspaceId;

    this.modelSelector = new ModelSelector();
    this.processManager = new WorkerProcessManager();
    this.ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_BASE_URL);
  }

  public start(): void {
    if (this.profile !== 'hybrid') {
      console.log(SYSTEM_MESSAGE.DISPATCH_NOT_HYBRID);
      return;
    }

    if (this.running) return;
    this.running = true;
    console.log(SYSTEM_MESSAGE.DISPATCH_STARTING);
    this.loop();
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    console.log(SYSTEM_MESSAGE.DISPATCH_STOPPING);
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const queueStatus = this.queue.getStatus();
        const dispatchableTasks = this.queue.getDispatchableTasks();
        const task = dispatchableTasks[0] || null;

        if (!task) {
          // No task available, sleep 2s
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // 2. stateManager.moveToActive(task.id)
        this.stateManager.moveToActive(task.id);

        // 3. modelSelector.selectProfile(task, queueStatus)
        const profile = await this.modelSelector.selectProfile(task, queueStatus);

        // 4. processManager.spawn(...)
        const worker = this.workerRegistry.register();
        const workerId = worker.id;
        const assignmentPayload: AssignmentPayload = {
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
          }
        };
        const assignment: AssignmentEnvelope = {
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
        this.workerRegistry.assignTask(workerId, task.id);
        const payload = {
          worker_id: workerId,
          task_id: task.id,
          assignment,
          task_details: JSON.stringify({
            assignment,
            description: (task as any).description || task.action,
          }, null, 2),
          target_files: Array.isArray((task as any).target_files) ? (task as any).target_files : [],
          model: profile.model,
          workspace_root: this.workspaceRoot,
          server_url: this.serverUrl,
          allowed_tools: this.allowedTools
        };

        const { pid } = this.processManager.spawn(payload);

        // 5. Wait for worker exit OR timeout
        const exitResult = await new Promise<{ code: number | null; signal: NodeJS.Signals | null } | 'timeout'>((resolve) => {
          const onExit = (data: any) => {
            if (data.worker_id === workerId) {
              this.processManager.removeListener('worker:exit', onExit);
              this.processManager.removeListener('worker:timeout', onTimeout);
              resolve({ code: data.code, signal: data.signal });
            }
          };

          const onTimeout = (data: any) => {
            if (data.worker_id === workerId) {
              this.processManager.removeListener('worker:exit', onExit);
              this.processManager.removeListener('worker:timeout', onTimeout);
              resolve('timeout');
            }
          };

          this.processManager.on('worker:exit', onExit);
          this.processManager.on('worker:timeout', onTimeout);
        });

        if (exitResult === 'timeout') {
          console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_TIMEOUT(workerId, task.id));
          this.workerRegistry.clearAssignment(workerId);
          if (this.stateManager.isTaskInActive(task.id)) {
            this.stateManager.requeueWithRetry(task.id, this.workspaceRoot);
          }
        } else if (exitResult.code !== 0) {
          console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_EXITED(workerId, exitResult.code, task.id));
          this.workerRegistry.clearAssignment(workerId);
          if (this.stateManager.isTaskInActive(task.id)) {
            this.stateManager.requeueWithRetry(task.id, this.workspaceRoot);
          }
        } else {
          // Worker successfully called complete_task and exited 0.
          // StateManager was already notified via HTTP endpoint.
          console.log(SYSTEM_MESSAGE.DISPATCH_WORKER_SUCCESS(workerId, task.id));
        }

        // 6. ollamaClient.unload(model)
        try {
          const unloaded = await this.ollamaAdapter.unload(profile.model);
          if (unloaded) {
            console.log(SYSTEM_MESSAGE.DISPATCH_MODEL_UNLOADED(profile.model));
          }
        } catch (err: any) {
          console.warn(SYSTEM_MESSAGE.DISPATCH_MODEL_UNLOAD_FAILED(profile.model, err.message));
        }

      } catch (err: any) {
        console.error(SYSTEM_MESSAGE.DISPATCH_ERROR(err.message));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}
