import crypto from 'crypto';
import { WORKER_STATUS } from '../constants.mjs';

export const generateWorkerId = () => `w-${crypto.randomBytes(4).toString('hex')}`;

export class WorkerRegistry {
  constructor() {
    this.workers = new Map();
  }

  register() {
    const id = generateWorkerId();
    const workerInfo = {
      id,
      registered_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_task: null,
      tasks_completed: 0,
      status: WORKER_STATUS.IDLE
    };
    this.workers.set(id, workerInfo);
    return workerInfo;
  }

  getWorker(id) {
    return this.workers.get(id);
  }

  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  updateHeartbeat(id) {
    const worker = this.workers.get(id);
    if (worker) {
      worker.last_heartbeat = new Date().toISOString();
      return true;
    }
    return false;
  }
}

// Export a singleton instance
export const workerRegistry = new WorkerRegistry();
