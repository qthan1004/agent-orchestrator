import type { TaskQueue } from '../mcp-server/task-queue.js';
import type { StateManager } from '../mcp-server/state-manager.js';
import { ModelSelector } from './model-selector.js';
import { WorkerProcessManager } from './process-manager.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import { SYSTEM_MESSAGE } from '../constants.js';

export interface DispatchLoopConfig {
  queue: TaskQueue;
  stateManager: StateManager;
  profile: 'default' | 'hybrid';
  serverUrl: string;
  workspaceRoot: string;
  allowedTools: string[];
}

export class TaskDispatchLoop {
  private running = false;
  private queue: TaskQueue;
  private stateManager: StateManager;
  private modelSelector: ModelSelector;
  private processManager: WorkerProcessManager;
  private ollamaAdapter: OllamaAdapter;
  private profile: 'default' | 'hybrid';
  private serverUrl: string;
  private workspaceRoot: string;
  private allowedTools: string[];

  constructor(config: DispatchLoopConfig) {
    this.queue = config.queue;
    this.stateManager = config.stateManager;
    this.profile = config.profile;
    this.serverUrl = config.serverUrl;
    this.workspaceRoot = config.workspaceRoot;
    this.allowedTools = config.allowedTools;

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
        const task = this.queue.getNextTask();

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
        const workerId = `worker-${Date.now()}`;
        const payload = {
          worker_id: workerId,
          task_id: task.id,
          task_details: task,
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
          this.stateManager.requeueWithRetry(task.id, this.workspaceRoot);
        } else if (exitResult.code !== 0) {
          console.warn(SYSTEM_MESSAGE.DISPATCH_WORKER_EXITED(workerId, exitResult.code, task.id));
          this.stateManager.requeueWithRetry(task.id, this.workspaceRoot);
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
