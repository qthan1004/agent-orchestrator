import crypto from 'crypto';
import path from 'path';
import { WORKER_STATUS, WORKER_ROLE } from '../constants.js';
import { readJSON, writeJSON, ensureDir } from './file-backend.js';
import type { WorkerInfo } from '../models/index.js';
import type { TaskIdentityRegistry } from './task-identity-registry.js';
import { assertCanAssignTask, getWorkerCurrentTaskId } from './identity-invariants.js';

export const generateWorkerId = (): string => `w-${crypto.randomBytes(4).toString('hex')}`;

export class WorkerRegistry {
  private workers: Map<string, WorkerInfo>;
  private registryFilePath: string | null;

  constructor(registryFilePath?: string) {
    this.workers = new Map<string, WorkerInfo>();
    this.registryFilePath = registryFilePath || null;
    if (this.registryFilePath) {
      this._load();
    }
  }

  /**
   * Set the registry file path (called during server init when config is available).
   */
  setRegistryPath(filePath: string): void {
    this.registryFilePath = filePath;
    this.workers.clear();
    this._load();
  }

  private _load(): void {
    if (!this.registryFilePath) return;
    const data = readJSON<WorkerInfo[]>(this.registryFilePath);
    if (data && Array.isArray(data)) {
      for (const raw of data) {
        const w: WorkerInfo = {
          ...raw,
          workspace_id: raw.workspace_id || 'unknown',
          current_task_id: raw.current_task_id || raw.current_task || null,
          current_task: raw.current_task || raw.current_task_id || null,
        };
        this.workers.set(w.id, w);
      }
    }
  }

  private _save(): void {
    if (!this.registryFilePath) return;
    ensureDir(path.dirname(this.registryFilePath));
    writeJSON(this.registryFilePath, Array.from(this.workers.values()));
  }

  register(workspaceId: string): WorkerInfo {
    const id = generateWorkerId();
    const workerInfo: WorkerInfo = {
      id,
      workspace_id: workspaceId,
      role: null,
      registered_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_task_id: null,
      current_task: null,
      tasks_completed: 0,
      status: WORKER_STATUS.IDLE
    };
    this.workers.set(id, workerInfo);
    this._save();
    return workerInfo;
  }

  getWorker(id: string): WorkerInfo | undefined {
    return this.workers.get(id);
  }

  getAllWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  /**
   * Count only non-disconnected workers.
   */
  getActiveWorkerCount(): number {
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
   * @returns true if worker existed
   */
  markDisconnected(id: string): boolean {
    const worker = this.workers.get(id);
    if (worker) {
      worker.status = WORKER_STATUS.DISCONNECTED;
      worker.current_task_id = null;
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
   * @returns number of workers cleaned up
   */
  cleanupDisconnected(): number {
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

  clearAll(): void {
    this.workers.clear();
    this._save();
  }

  /**
   * @deprecated Use markDisconnected instead. Kept for backward compat.
   */
  removeWorker(id: string): boolean {
    return this.markDisconnected(id);
  }

  updateHeartbeat(id: string): boolean {
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

  setRole(workerId: string, role: typeof WORKER_ROLE[keyof typeof WORKER_ROLE]): boolean {
    const w = this.workers.get(workerId);
    if (w) {
      w.role = role;
      this._save();
      return true;
    }
    return false;
  }

  assignTask(workerId: string, taskId: string, taskRegistry?: TaskIdentityRegistry): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    const currentTaskId = getWorkerCurrentTaskId(worker);
    if (currentTaskId && currentTaskId !== taskId) {
      throw new Error(`Worker ${workerId} already owns active task ${currentTaskId}.`);
    }

    if (taskRegistry) {
      const task = taskRegistry.getById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found in identity registry.`);
      }
      assertCanAssignTask(worker, task, this.getAllWorkers());
      taskRegistry.assignTask(taskId, workerId, worker.workspace_id);
    } else {
      const otherOwner = this.getAllWorkers().find(other =>
        other.id !== workerId &&
        other.status !== WORKER_STATUS.DISCONNECTED &&
        getWorkerCurrentTaskId(other) === taskId
      );
      if (otherOwner) {
        throw new Error(`Task ${taskId} is already owned by worker ${otherOwner.id}.`);
      }
    }

    worker.current_task_id = taskId;
    worker.current_task = taskId;
    worker.status = WORKER_STATUS.BUSY;
    worker.last_heartbeat = new Date().toISOString();
    this._save();
    return true;
  }

  clearAssignment(workerId: string, taskRegistry?: TaskIdentityRegistry): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    const currentTaskId = getWorkerCurrentTaskId(worker);
    if (currentTaskId && taskRegistry) {
      taskRegistry.clearAssignment(currentTaskId);
    }
    worker.current_task_id = null;
    worker.current_task = null;
    worker.status = WORKER_STATUS.IDLE;
    worker.last_heartbeat = new Date().toISOString();
    this._save();
    return true;
  }

  getActivePlanner(plannerAliveThresholdMs: number): WorkerInfo | null {
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

// Export a singleton instance (registry path set later via setRegistryPath)
export const workerRegistry = new WorkerRegistry();
