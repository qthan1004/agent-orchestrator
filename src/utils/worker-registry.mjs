import crypto from 'crypto';
import path from 'path';
import { WORKER_STATUS, WORKER_ROLE } from '../constants.mjs';
import { loadConfig } from '../config.mjs';
import { readJSON, writeJSON, ensureDir } from './file-backend.mjs';

const config = loadConfig();
const registryFilePath = path.join(config.exchange.base, 'workers.json');

export const generateWorkerId = () => `w-${crypto.randomBytes(4).toString('hex')}`;

export class WorkerRegistry {
  constructor() {
    this.workers = new Map();
    this._load();
  }

  _load() {
    const data = readJSON(registryFilePath);
    if (data && Array.isArray(data)) {
      for (const w of data) {
        this.workers.set(w.id, w);
      }
    }
  }

  _save() {
    ensureDir(path.dirname(registryFilePath));
    writeJSON(registryFilePath, Array.from(this.workers.values()));
  }

  register() {
    const id = generateWorkerId();
    const workerInfo = {
      id,
      role: null,
      registered_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_task: null,
      tasks_completed: 0,
      status: WORKER_STATUS.IDLE
    };
    this.workers.set(id, workerInfo);
    this._save();
    return workerInfo;
  }

  getWorker(id) {
    return this.workers.get(id);
  }

  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  /**
   * Count only non-disconnected workers.
   */
  getActiveWorkerCount() {
    let count = 0;
    for (const w of this.workers.values()) {
      if (w.status !== WORKER_STATUS.DISCONNECTED) count++;
    }
    return count;
  }

  /**
   * Mark worker as DISCONNECTED instead of deleting.
   * Keeps the entry so late complete_task calls can still resolve.
   * Clears current_task assignment.
   * @returns {boolean} true if worker existed
   */
  markDisconnected(id) {
    const worker = this.workers.get(id);
    if (worker) {
      worker.status = WORKER_STATUS.DISCONNECTED;
      worker.current_task = null;
      worker.disconnected_at = new Date().toISOString();
      this._save();
      return true;
    }
    return false;
  }

  /**
   * Remove all DISCONNECTED workers from registry.
   * Call during startup to clean stale entries from previous runs.
   * @returns {number} number of workers cleaned up
   */
  cleanupDisconnected() {
    let count = 0;
    for (const [id, worker] of this.workers) {
      if (worker.status === WORKER_STATUS.DISCONNECTED) {
        this.workers.delete(id);
        count++;
      }
    }
    if (count > 0) this._save();
    return count;
  }

  /**
   * @deprecated Use markDisconnected instead. Kept for backward compat.
   */
  removeWorker(id) {
    return this.markDisconnected(id);
  }

  updateHeartbeat(id) {
    const worker = this.workers.get(id);
    if (worker) {
      worker.last_heartbeat = new Date().toISOString();
      // Re-activate a disconnected worker that comes back alive
      if (worker.status === WORKER_STATUS.DISCONNECTED) {
        worker.status = WORKER_STATUS.IDLE;
        delete worker.disconnected_at;
      }
      this._save();
      return true;
    }
    return false;
  }

  setRole(workerId, role) {
    const w = this.workers.get(workerId);
    if (w) {
      w.role = role;
      this._save();
      return true;
    }
    return false;
  }

  getActivePlanner(plannerAliveThresholdMs) {
    const now = Date.now();
    for (const w of this.workers.values()) {
      if (w.role === WORKER_ROLE.PLANNER && w.status !== WORKER_STATUS.DISCONNECTED) {
        const elapsed = now - new Date(w.last_heartbeat).getTime();
        if (elapsed < plannerAliveThresholdMs) return w;
      }
    }
    return null;
  }
}

// Export a singleton instance
export const workerRegistry = new WorkerRegistry();
