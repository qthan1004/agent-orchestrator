import path from 'path';
import { loadConfig } from '../config.mjs';
import { readJSON, writeJSON, moveFile, listFiles, ensureDir } from '../utils/file-backend.mjs';
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

    moveFile(src, dest);
    
    // Also update the status inside the file
    const taskData = readJSON(dest);
    if (taskData) {
      taskData.status = TASK_STATUS.ACTIVE;
      writeJSON(dest, taskData);
    }

    this.queue.completeTask(taskId, TASK_STATUS.ACTIVE);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.TASK_ACTIVATED, { message: `Moved task ${taskId} to active` });
    }
  }

  moveToOutbox(taskId, result) {
    const src = path.join(this.config.exchange.active, `${FILE_PREFIXES.TASK}${taskId}.json`);
    const dest = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.TASK}${taskId}.json`);

    moveFile(src, dest);
    
    // Also update the status inside the file
    const taskData = readJSON(dest);
    if (taskData) {
      taskData.status = result.status; // DONE or FAILED usually
      writeJSON(dest, taskData);
    }

    const resultPath = path.join(this.config.exchange.outbox, `${FILE_PREFIXES.RESULT}${taskId}.json`);
    writeJSON(resultPath, result);

    this.queue.completeTask(taskId, result.status);

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

    const queuePath = path.join(this.config.exchange.base, FILE_PREFIXES.QUEUE);
    const graphData = readJSON(queuePath) || { groups: [] };

    this.queue.loadFromState(rebuiltMap, graphData);

    if (this.logger) {
        this.logger.log(STATE_EVENTS.STATE_RESTORED, { message: 'Restored queue and tasks from files' });
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
