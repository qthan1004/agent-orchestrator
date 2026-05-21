import path from 'path';
import { TASK_STATUS, type TaskStatusValue } from '../constants.js';
import type { QueueTask } from '../mcp-server/task-queue.js';
import type { TaskIdentityRecord } from '../models/index.js';
import { ensureDir, readJSON, writeJSON } from './file-backend.js';
import { assertTaskRegistryRecordHasNoBody } from './identity-invariants.js';

export interface RegisterTaskIdentityInput {
  task_id: string;
  workspace_id: string;
  task_content_path?: string;
  status?: TaskStatusValue;
  created_at?: string;
  retry_count?: number;
}

export class TaskIdentityRegistry {
  private registryPath: string;
  private workspaceId: string;

  constructor(registryPath: string, workspaceId: string) {
    this.registryPath = registryPath;
    this.workspaceId = workspaceId;
  }

  private loadAll(): TaskIdentityRecord[] {
    const data = readJSON<TaskIdentityRecord[]>(this.registryPath);
    return Array.isArray(data) ? data : [];
  }

  private saveAll(records: TaskIdentityRecord[]): void {
    for (const record of records) {
      assertTaskRegistryRecordHasNoBody(record as unknown as Record<string, unknown>);
    }
    ensureDir(path.dirname(this.registryPath));
    writeJSON(this.registryPath, records);
  }

  private assertWorkspace(workspaceId: string): void {
    if (workspaceId !== this.workspaceId) {
      throw new Error(`Workspace mismatch: expected ${this.workspaceId}, received ${workspaceId}.`);
    }
  }

  registerTask(input: RegisterTaskIdentityInput): TaskIdentityRecord {
    this.assertWorkspace(input.workspace_id);
    const records = this.loadAll();
    if (records.some(record => record.task_id === input.task_id)) {
      throw new Error(`Task ${input.task_id} is already registered.`);
    }

    const now = new Date().toISOString();
    const record: TaskIdentityRecord = {
      task_id: input.task_id,
      workspace_id: input.workspace_id,
      task_content_path: input.task_content_path || '',
      status: input.status || TASK_STATUS.PENDING,
      assigned_worker_id: null,
      created_at: input.created_at || now,
      updated_at: now,
      retry_count: input.retry_count,
    };

    this.saveAll([...records, record]);
    return record;
  }

  upsertTask(input: RegisterTaskIdentityInput): TaskIdentityRecord {
    this.assertWorkspace(input.workspace_id);
    const records = this.loadAll();
    const now = new Date().toISOString();
    const index = records.findIndex(record => record.task_id === input.task_id);

    if (index === -1) {
      return this.registerTask(input);
    }

    const existing = records[index];
    const updated: TaskIdentityRecord = {
      ...existing,
      workspace_id: input.workspace_id,
      task_content_path: input.task_content_path ?? existing.task_content_path,
      status: input.status || existing.status,
      retry_count: input.retry_count ?? existing.retry_count,
      updated_at: now,
    };
    records[index] = updated;
    this.saveAll(records);
    return updated;
  }

  getById(taskId: string): TaskIdentityRecord | null {
    return this.loadAll().find(record => record.task_id === taskId) || null;
  }

  getAll(): TaskIdentityRecord[] {
    return this.loadAll();
  }

  setStatus(
    taskId: string,
    status: TaskStatusValue,
    extra: Partial<Pick<TaskIdentityRecord, 'retry_count' | 'started_at' | 'completed_at'>> = {}
  ): TaskIdentityRecord {
    const records = this.loadAll();
    const index = records.findIndex(record => record.task_id === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found in identity registry.`);
    }

    const current = records[index];
    this.assertWorkspace(current.workspace_id);

    const updated: TaskIdentityRecord = {
      ...current,
      ...extra,
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === TASK_STATUS.PENDING) {
      updated.assigned_worker_id = null;
      delete updated.started_at;
    }
    if (status === TASK_STATUS.ACTIVE && !updated.started_at) {
      updated.started_at = updated.updated_at;
    }
    if (status === TASK_STATUS.DONE || status === TASK_STATUS.FAILED || status === TASK_STATUS.BLOCKED) {
      updated.assigned_worker_id = null;
      updated.completed_at = updated.completed_at || updated.updated_at;
    }

    records[index] = updated;
    this.saveAll(records);
    return updated;
  }

  assignTask(taskId: string, workerId: string, workspaceId: string): TaskIdentityRecord {
    this.assertWorkspace(workspaceId);
    const records = this.loadAll();
    const index = records.findIndex(record => record.task_id === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found in identity registry.`);
    }

    const current = records[index];
    this.assertWorkspace(current.workspace_id);
    if (current.status !== TASK_STATUS.ACTIVE) {
      throw new Error(`Task ${taskId} must be active before assignment. Current status: ${current.status}.`);
    }
    if (current.assigned_worker_id && current.assigned_worker_id !== workerId) {
      throw new Error(`Task ${taskId} is already assigned to worker ${current.assigned_worker_id}.`);
    }

    const updated = {
      ...current,
      assigned_worker_id: workerId,
      updated_at: new Date().toISOString(),
    };
    records[index] = updated;
    this.saveAll(records);
    return updated;
  }

  clearAssignment(taskId: string): void {
    const records = this.loadAll();
    const index = records.findIndex(record => record.task_id === taskId);
    if (index === -1) return;

    records[index] = {
      ...records[index],
      assigned_worker_id: null,
      updated_at: new Date().toISOString(),
    };
    this.saveAll(records);
  }

  getActiveTasksForWorkspace(workspaceId: string): TaskIdentityRecord[] {
    return this.loadAll().filter(record =>
      record.workspace_id === workspaceId &&
      (record.status === TASK_STATUS.ACTIVE || Boolean(record.assigned_worker_id))
    );
  }

  upsertFromQueueTask(task: QueueTask, workspaceId: string, status: TaskStatusValue): TaskIdentityRecord {
    return this.upsertTask({
      task_id: task.id,
      workspace_id: (task as any).workspace_id || workspaceId,
      task_content_path: (task as any).task_content_path || '',
      status,
      created_at: (task as any).created_at,
      retry_count: task.retry_count,
    });
  }
}
