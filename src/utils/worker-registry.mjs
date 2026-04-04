import crypto from 'crypto';

export class WorkerRegistry {
  constructor() {
    this.workers = new Map();
  }

  register() {
    // Generate UUID with format w-<8chars>
    const id = `w-${crypto.randomBytes(4).toString('hex')}`;
    const workerInfo = {
      id,
      registered_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_task: null,
      tasks_completed: 0,
      status: 'idle'
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
