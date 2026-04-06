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

  updateHeartbeat(id) {
    const worker = this.workers.get(id);
    if (worker) {
      worker.last_heartbeat = new Date().toISOString();
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

  getActivePlanner(staleThresholdMs) {
    const now = Date.now();
    for (const w of this.workers.values()) {
      if (w.role === WORKER_ROLE.PLANNER) {
        const elapsed = now - new Date(w.last_heartbeat).getTime();
        if (elapsed < staleThresholdMs) return w;
      }
    }
    return null;
  }
}

// Export a singleton instance
export const workerRegistry = new WorkerRegistry();
