import path from 'path';
import fs from 'fs';
import { readJSON, writeJSON, moveFile, listFiles, ensureDir, readFile } from '../utils/file-backend.js';
import { TaskQueue, type TaskQueueStatus } from './task-queue.js';
import { TASK_STATUS, FILE_PREFIXES, STATE_EVENTS, RECOVERY_EVENTS, RECOVERY_DEFAULTS, type TaskStatusValue } from '../constants.js';
import type { AppConfig, TaskDef, TaskGraph, TaskResult } from '../models/index.js';
import type { Logger } from '../utils/logger.js';

const MAX_CHECKPOINTS = 10;

export interface PlanMeta {
  [key: string]: unknown;
}

export interface PlansQuickStatus {
  hasPending: boolean;
  hasProcessing: boolean;
  pendingCount: number;
  processingCount: number;
}

export interface ProcessingPlanResult {
  current: string;
  plan_path: string;
  content: string | null;
}

export type CheckPlansResult =
  | {
      status: 'busy';
      current: string;
      plan_path: string;
      content: string | null;
      pending_count: number;
    }
  | {
      status: 'idle';
      current: null;
      pending_count: 0;
    }
  | {
      status: 'ready';
      current: string;
      plan_path: string;
      content: string | null;
      pending_count: number;
    };

export class StateManager {
  config: AppConfig;
  queue: TaskQueue;
  logger: Logger | null;
  plan: PlanMeta | null;

  /**
   * @param {import('../utils/logger.js').Logger} logger
   * @param {object} config - Config from loadConfig(overrides)
   */
  constructor(logger: Logger | null, config: AppConfig) {
    this.config = config;
    this.queue = new TaskQueue();
    this.logger = logger;
    this.plan = null;

    // Ensure exchange directories exist
    ensureDir(this.config.exchange.inbox);
    ensureDir(this.config.exchange.active);
    ensureDir(this.config.exchange.outbox);
  }

  // Plan management
  loadPlan(planMeta: PlanMeta): void {
    this.plan = planMeta;
    if (this.logger) {
      this.logger.log(STATE_EVENTS.PLAN_LOADED, { message: 'Loaded plan metadata', plan: planMeta });
    }
  }

  getPlan(): PlanMeta | null {
    return this.plan;
  }

  // Plan state machine: pending/ → processing/ → done/
  checkPlansQuick(): PlansQuickStatus {
    ensureDir(this.config.plans.pending);
    ensureDir(this.config.plans.processing);
    
    const pendingFiles = listFiles(this.config.plans.pending, '.md');
    const processingFiles = listFiles(this.config.plans.processing, '.md');
    
    return {
      hasPending: pendingFiles.length > 0,
      hasProcessing: processingFiles.length > 0,
      pendingCount: pendingFiles.length,
      processingCount: processingFiles.length
    };
  }

  getProcessingPlan(): ProcessingPlanResult | null {
    const files = listFiles(this.config.plans.processing, '.md');
    if (files.length === 0) return null;
    
    const filename = files[0];
    return {
      current: filename,
      plan_path: `plan/processing/${filename}`,
      content: readFile(path.join(this.config.plans.processing, filename))
    };
  }

  checkPlans(): CheckPlansResult {
    ensureDir(this.config.plans.pending);
    ensureDir(this.config.plans.processing);
    ensureDir(this.config.plans.done);

    // Already processing a plan? → Don't pick another
    const processingFiles = listFiles(this.config.plans.processing, '.md');
    if (processingFiles.length > 0) {
      return {
        status: 'busy',
        current: processingFiles[0],
        plan_path: `plan/processing/${processingFiles[0]}`,
        content: readFile(path.join(this.config.plans.processing, processingFiles[0])),
        pending_count: listFiles(this.config.plans.pending, '.md').length
      };
    }

    // Scan pending, FIFO sort by filename (use timestamp prefix for ordering)
    const pendingFiles = listFiles(this.config.plans.pending, '.md').sort();
    if (pendingFiles.length === 0) {
      return { status: 'idle', current: null, pending_count: 0 };
    }

    // Pick oldest → move to processing/
    const nextFile = pendingFiles[0];
    const src = path.join(this.config.plans.pending, nextFile);
    const dest = path.join(this.config.plans.processing, nextFile);
    moveFile(src, dest);

    if (this.logger) {
      this.logger.log(STATE_EVENTS.PLAN_PROCESSING, { filename: nextFile, pending_remaining: pendingFiles.length - 1 });
    }

    return {
      status: 'ready',
      current: nextFile,
      plan_path: `plan/processing/${nextFile}`,
      content: readFile(dest),
      pending_count: pendingFiles.length - 1
    };
  }

  completePlan(filename: string): void {
    const src = path.join(this.config.plans.processing, filename);
    const dest = path.join(this.config.plans.done, filename);
    moveFile(src, dest);

    if (this.logger) {
      this.logger.log(STATE_EVENTS.PLAN_COMPLETED, { filename });
    }
  }

  // Task management
  storeTasks(tasks: TaskDef[], graph: TaskGraph): void {
    this.queue.validateDAG(graph);
    this.queue.loadFromGraph(tasks, graph);

    // Write internal tasks to inbox/
    for (const task of tasks) {
      const filePath = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${task.id}.json`);
      writeJSON(filePath, { ...task, status: TASK_STATUS.PENDING });
    }

    // Write graph metadata to exchange/_queue.json
    const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
    writeJSON(queuePath, { groups: this.queue.groups });

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASKS_STORED, { message: 'Stored new tasks and queue metadata' });
    }
  }

  moveToActive(taskId: string): void {
    const src = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);

    const moved = moveFile(src, dest);
    if (!moved) {
      throw new Error(`Failed to move task ${taskId} from inbox to active: file not found or permission error`);
    }
    
    // Also update the status inside the file
    const taskData = readJSON<TaskDef>(dest);
    if (taskData) {
      taskData.status = TASK_STATUS.ACTIVE;
      writeJSON(dest, taskData);
    }

    this.queue.updateTaskStatus(taskId, TASK_STATUS.ACTIVE);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_ACTIVATED, { message: `Moved task ${taskId} to active` });
    }
  }

  moveToOutbox(taskId: string, result: TaskResult): void {
    const src = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

    const moved = moveFile(src, dest);
    if (!moved) {
      throw new Error(`Failed to move task ${taskId} from active to outbox: file not found or permission error`);
    }
    
    // Also update the status inside the file
    const taskData = readJSON<TaskDef>(dest);
    if (taskData) {
      taskData.status = result.status; // DONE or FAILED usually
      writeJSON(dest, taskData);
    }

    const resultPath = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.RESULT}${taskId}.json`);
    writeJSON(resultPath, result);

    this.queue.updateTaskStatus(taskId, result.status);
    
    // Garbage collection on the DAG queue
    const prunedCount = this.queue.pruneCompletedGroups();
    if (prunedCount > 0) {
      const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
      writeJSON(queuePath, { groups: this.queue.groups });
    }

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_COMPLETED, { message: `Moved task ${taskId} to outbox with status ${result.status}` });
    }
  }

  /**
   * Check if a task file exists in active/ directory.
   * Used by recovery to guard against race conditions.
   */
  isTaskInActive(taskId: string): boolean {
    const activePath = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    return fs.existsSync(activePath);
  }

  moveToInbox(taskId: string): void {
    const activePath = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const outboxPath = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

    let found = moveFile(activePath, dest);
    if (!found) {
      found = moveFile(outboxPath, dest);
    }
    
    if (found) {
        // Also update the status inside the file
        const taskData = readJSON<TaskDef>(dest);
        if (taskData) {
        taskData.status = TASK_STATUS.PENDING;
        writeJSON(dest, taskData);
        }
    }

    this.queue.requeueTask(taskId);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_REQUEUED, { message: `Moved task ${taskId} back to inbox` });
    }
  }

  /**
   * Get retry count for a task (reads from file on disk).
   * Checks active/ first, then outbox/, then inbox/.
   */
  getTaskRetryCount(taskId: string): number {
    const dirs = [this.config.exchange.active, this.config.exchange.outbox, this.config.exchange.inbox];
    for (const dir of dirs) {
      const filePath = path.join(dir, `${FILE_PREFIXES.TASK}${taskId}.json`);
      const data = readJSON<TaskDef>(filePath);
      if (data) return data.retry_count || 0;
    }
    // Fallback to in-memory
    const task = this.queue.tasks.get(taskId);
    return task?.retry_count || 0;
  }

  /**
   * Requeue a task with incremented retry count.
   * Increments retry_count in the file before moving to inbox.
   * Returns the new retry count.
   */
  requeueWithRetry(taskId: string, workspaceRoot?: string): number {
    // Find and increment retry_count in the task file
    const dirs = [this.config.exchange.active, this.config.exchange.outbox];
    let newRetryCount = 1;

    for (const dir of dirs) {
      const filePath = path.join(dir, `${FILE_PREFIXES.TASK}${taskId}.json`);
      const data = readJSON<TaskDef>(filePath);
      if (data) {
        newRetryCount = (data.retry_count || 0) + 1;
        data.retry_count = newRetryCount;

        // Attach error_context from session.json if available
        if (workspaceRoot) {
          const sessionPath = path.join(workspaceRoot, '.agent', 'session.json');
          try {
            if (fs.existsSync(sessionPath)) {
              const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
              if (sessionData.error_context && sessionData.task_id === taskId) {
                data.error_context = sessionData.error_context;
              }
            }
          } catch {
            // Non-critical: session read failure shouldn't block requeue
          }
        }

        writeJSON(filePath, data);
        break;
      }
    }

    // Move to inbox (handles file move + status=PENDING + queue.requeueTask)
    this.moveToInbox(taskId);

    // Sync retry_count to in-memory task
    const task = this.queue.tasks.get(taskId);
    if (task) {
      task.retry_count = newRetryCount;
    }

    if (this.logger) {
      this.logger.log(STATE_EVENTS.TASK_REQUEUED, {
        task_id: taskId,
        retry_count: newRetryCount,
        message: `Task ${taskId} requeued with retry count ${newRetryCount}`
      });
    }

    return newRetryCount;
  }

  // Recovery (file-based)
  restoreFromFiles(): void {
    const rebuiltMap = new Map<string, TaskDef>();

    const loadDir = (dirPath: string, expectedStatus: TaskStatusValue) => {
      const files = listFiles(dirPath, '.json')
          .filter(f => f.startsWith(FILE_PREFIXES.TASK));
      for (const f of files) {
        const fullPath = path.join(dirPath, f);
        const data = readJSON<TaskDef>(fullPath);
        if (data && data.id) {
          rebuiltMap.set(data.id, { ...data, status: data.status || expectedStatus });
        }
      }
    };

    // Note: status inside file may be more accurate, but fallback to expectedStatus 
    // if not present. Our write flow updates it.
    loadDir(this.config.exchange.inbox, TASK_STATUS.PENDING);
    loadDir(this.config.exchange.active, TASK_STATUS.ACTIVE);
    loadDir(this.config.exchange.outbox, TASK_STATUS.DONE);

    // Auto-recover FAILED tasks in outbox: move them back to inbox as PENDING
    // BUT respect retry_count — permanently failed tasks (>= MAX_TASK_RETRIES) stay in outbox
    const failedTasks: string[] = [];
    const maxTaskRetries = this.config.recovery?.maxTaskRetries ?? RECOVERY_DEFAULTS.MAX_TASK_RETRIES;
    for (const [taskId, task] of rebuiltMap) {
      if (task.status === TASK_STATUS.FAILED) {
        const retryCount = task.retry_count || 0;
        if (retryCount < maxTaskRetries) {
          failedTasks.push(taskId);
        } else {
          if (this.logger) {
            this.logger.log(STATE_EVENTS.TASK_PERMANENTLY_FAILED, {
              task_id: taskId,
              retry_count: retryCount,
              message: `Task ${taskId} permanently failed (${retryCount} retries), skipping auto-recovery`
            });
          }
        }
      }
    }

    for (const taskId of failedTasks) {
      const srcTask = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
      const destTask = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

      // Move task file from outbox → inbox
      if (moveFile(srcTask, destTask)) {
        // Update status inside file
        const taskData = readJSON<TaskDef>(destTask);
        if (taskData) {
          taskData.status = TASK_STATUS.PENDING;
          writeJSON(destTask, taskData);
        }
        // Update in-memory map
        const rebuiltTask = rebuiltMap.get(taskId);
        if (rebuiltTask) rebuiltTask.status = TASK_STATUS.PENDING;

        if (this.logger) {
          this.logger.log(STATE_EVENTS.TASK_REQUEUED, {
            message: `Auto-recovered failed task ${taskId} from outbox → inbox`
          });
        }
      }
    }

    const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
    const graphData = readJSON<TaskGraph>(queuePath) || { groups: [] };

    this.queue.loadFromState(rebuiltMap, graphData);
    
    // GC on startup: prune old DONE tasks loaded from outbox
    const prunedCount = this.queue.pruneCompletedGroups();
    if (prunedCount > 0) {
      writeJSON(queuePath, { groups: this.queue.groups });
    }

    if (this.logger) {
        this.logger.log(STATE_EVENTS.STATE_RESTORED, {
          message: `Restored queue from files (recovered ${failedTasks.length} failed tasks, pruned ${prunedCount} old groups)`
        });
    }
  }

  // State query
  getStatus(): TaskQueueStatus {
    return this.queue.getStatus();
  }

  // Checkpointing
  saveCheckpoint(): string {
    ensureDir(this.config.exchange.checkpoints);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointFileName = `checkpoint-${timestamp}.json`;
    const checkpointPath = path.join(this.config.exchange.checkpoints, checkpointFileName);
    
    // Write serialized queue
    writeJSON(checkpointPath, this.queue.serialize());

    // Rotate: keep only the newest MAX_CHECKPOINTS files
    this._rotateCheckpoints();

    if (this.logger) {
      this.logger.log(STATE_EVENTS.CHECKPOINT_SAVED, { file: checkpointFileName });
    }

    return `checkpoints/${checkpointFileName}`;
  }

  /**
   * Remove old checkpoint files, keeping only the newest MAX_CHECKPOINTS.
   */
  private _rotateCheckpoints(): void {
    try {
      const files = listFiles(this.config.exchange.checkpoints, '.json')
        .filter(f => f.startsWith('checkpoint-'))
        .sort(); // lexicographic = chronological with ISO timestamp naming

      if (files.length <= MAX_CHECKPOINTS) return;

      const toDelete = files.slice(0, files.length - MAX_CHECKPOINTS);
      for (const file of toDelete) {
        const fullPath = path.join(this.config.exchange.checkpoints, file);
        try { fs.unlinkSync(fullPath); } catch (_) { /* ignore */ }
      }
    } catch (_) {
      // Non-critical — ignore rotation errors
    }
  }

  writeRecoverySignal(workerId: string, taskId: string | null, elapsedMs: number): void {
    ensureDir(this.config.exchange.signals);
    const signalPath = path.join(this.config.exchange.signals, 'recovery-needed.json');
    writeJSON(signalPath, {
      worker_id: workerId,
      last_task: taskId,
      stale_since: new Date(Date.now() - elapsedMs).toISOString(),
      resume_hint: "check .agent/session.json",
      created_at: new Date().toISOString()
    });

    if (this.logger) {
      this.logger.log(RECOVERY_EVENTS.STALE_WORKER_DETECTED, {
        message: `Recovery signal written for worker ${workerId}`
      });
    }
  }
}
