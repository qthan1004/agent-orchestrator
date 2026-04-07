import path from 'path';
import { loadConfig } from '../config.mjs';
import { readJSON, writeJSON, moveFile, listFiles, ensureDir, readFile } from '../utils/file-backend.mjs';
import { TaskQueue } from './task-queue.mjs';
import { TASK_STATUS, FILE_PREFIXES, STATE_EVENTS } from '../constants.mjs';

export class StateManager {
  constructor(logger) {
    this.config = loadConfig();
    this.queue = new TaskQueue();
    this.logger = logger;
    this.plan = null;

    // Ensure exchange directories exist
    ensureDir(this.config.exchange.inbox);
    ensureDir(this.config.exchange.active);
    ensureDir(this.config.exchange.outbox);
  }

  // Plan management
  loadPlan(planMeta) {
    this.plan = planMeta;
    if (this.logger) {
      this.logger.log(STATE_EVENTS.PLAN_LOADED, { message: 'Loaded plan metadata', plan: planMeta });
    }
  }

  getPlan() {
    return this.plan;
  }

  // Plan state machine: pending/ → processing/ → done/
  checkPlansQuick() {
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

  getProcessingPlan() {
    const files = listFiles(this.config.plans.processing, '.md');
    if (files.length === 0) return null;
    
    const filename = files[0];
    return {
      current: filename,
      plan_path: `plan/processing/${filename}`,
      content: readFile(path.join(this.config.plans.processing, filename))
    };
  }

  checkPlans() {
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

  completePlan(filename) {
    const src = path.join(this.config.plans.processing, filename);
    const dest = path.join(this.config.plans.done, filename);
    moveFile(src, dest);

    if (this.logger) {
      this.logger.log(STATE_EVENTS.PLAN_COMPLETED, { filename });
    }
  }

  // Task management
  storeTasks(tasks, graph) {
    this.queue.validateDAG(graph);
    this.queue.loadFromGraph(tasks, graph);

    // Write internal tasks to inbox/
    for (const task of tasks) {
      const filePath = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${task.id}.json`);
      writeJSON(filePath, { ...task, status: TASK_STATUS.PENDING });
    }

    // Write graph metadata to exchange/_queue.json
    const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
    writeJSON(queuePath, { groups: graph.groups });

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASKS_STORED, { message: 'Stored new tasks and queue metadata' });
    }
  }

  moveToActive(taskId) {
    const src = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);

    const moved = moveFile(src, dest);
    if (!moved) {
      throw new Error(`Failed to move task ${taskId} from inbox to active: file not found or permission error`);
    }
    
    // Also update the status inside the file
    const taskData = readJSON(dest);
    if (taskData) {
      taskData.status = TASK_STATUS.ACTIVE;
      writeJSON(dest, taskData);
    }

    this.queue.updateTaskStatus(taskId, TASK_STATUS.ACTIVE);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_ACTIVATED, { message: `Moved task ${taskId} to active` });
    }
  }

  moveToOutbox(taskId, result) {
    const src = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

    const moved = moveFile(src, dest);
    if (!moved) {
      throw new Error(`Failed to move task ${taskId} from active to outbox: file not found or permission error`);
    }
    
    // Also update the status inside the file
    const taskData = readJSON(dest);
    if (taskData) {
      taskData.status = result.status; // DONE or FAILED usually
      writeJSON(dest, taskData);
    }

    const resultPath = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.RESULT}${taskId}.json`);
    writeJSON(resultPath, result);

    this.queue.updateTaskStatus(taskId, result.status);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_COMPLETED, { message: `Moved task ${taskId} to outbox with status ${result.status}` });
    }
  }

  moveToInbox(taskId) {
    const activePath = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const outboxPath = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

    let found = moveFile(activePath, dest);
    if (!found) {
      found = moveFile(outboxPath, dest);
    }
    
    if (found) {
        // Also update the status inside the file
        const taskData = readJSON(dest);
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

  // Recovery (file-based)
  restoreFromFiles() {
    const rebuiltMap = new Map();

    const loadDir = (dirPath, expectedStatus) => {
      const files = listFiles(dirPath, '.json')
          .filter(f => f.startsWith(FILE_PREFIXES.TASK));
      for (const f of files) {
        const fullPath = path.join(dirPath, f);
        const data = readJSON(fullPath);
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
    const failedTasks = [];
    for (const [taskId, task] of rebuiltMap) {
      if (task.status === TASK_STATUS.FAILED) {
        failedTasks.push(taskId);
      }
    }

    for (const taskId of failedTasks) {
      const srcTask = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);
      const destTask = path.join(this.config.exchange.inbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

      // Move task file from outbox → inbox
      if (moveFile(srcTask, destTask)) {
        // Update status inside file
        const taskData = readJSON(destTask);
        if (taskData) {
          taskData.status = TASK_STATUS.PENDING;
          writeJSON(destTask, taskData);
        }
        // Update in-memory map
        rebuiltMap.get(taskId).status = TASK_STATUS.PENDING;

        if (this.logger) {
          this.logger.log(STATE_EVENTS.TASK_REQUEUED, {
            message: `Auto-recovered failed task ${taskId} from outbox → inbox`
          });
        }
      }
    }

    const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
    const graphData = readJSON(queuePath) || { groups: [] };

    this.queue.loadFromState(rebuiltMap, graphData);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.STATE_RESTORED, {
          message: `Restored queue from files (recovered ${failedTasks.length} failed tasks)`
        });
    }
  }

  // State query
  getStatus() {
    return this.queue.getStatus();
  }

  // Checkpointing
  saveCheckpoint() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointFileName = `checkpoint-${timestamp}.json`;
    const checkpointPath = path.join(this.config.exchange.checkpoints, checkpointFileName);
    
    // Write serialized queue
    writeJSON(checkpointPath, this.queue.serialize());

    if (this.logger) {
      this.logger.log(STATE_EVENTS.CHECKPOINT_SAVED, { file: checkpointFileName });
    }

    return `checkpoints/${checkpointFileName}`;
  }
}
