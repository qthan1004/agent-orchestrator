import { TASK_STATUS, WORKER_STATUS } from '../constants.js';
import type { WorkerInfo } from '../models/index.js';
import type { TaskIdentityRecord } from '../task/index.js';
import type { WorkspaceMetadata } from './workspace-registry.js';

const FORBIDDEN_TASK_BODY_FIELDS = new Set([
  'body',
  'content',
  'description',
  'task_body',
  'taskBody',
  'markdown',
]);

export function getWorkerCurrentTaskId(worker: WorkerInfo): string | null {
  return worker.current_task_id || worker.current_task || null;
}

export function assertActiveWorkspace(
  workspace: WorkspaceMetadata | null,
  workspaceId: string
): asserts workspace is WorkspaceMetadata {
  if (!workspace) {
    throw new Error(`Workspace "${workspaceId}" not found in registry.`);
  }
  if (workspace.status !== 'active') {
    throw new Error(`Workspace "${workspaceId}" is not active.`);
  }
}

export function assertWorkerWorkspace(worker: WorkerInfo, workspaceId: string): void {
  if (worker.workspace_id !== workspaceId) {
    throw new Error(`Worker ${worker.id} belongs to workspace ${worker.workspace_id}, not ${workspaceId}.`);
  }
}

export function assertTaskWorkspace(task: TaskIdentityRecord, workspaceId: string): void {
  if (task.workspace_id !== workspaceId) {
    throw new Error(`Task ${task.task_id} belongs to workspace ${task.workspace_id}, not ${workspaceId}.`);
  }
}

export function assertTaskRegistryRecordHasNoBody(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_TASK_BODY_FIELDS.has(key)) {
      throw new Error(`Task registry record must not store task body field "${key}".`);
    }
  }
}

export function assertCanAssignTask(
  worker: WorkerInfo,
  task: TaskIdentityRecord,
  workers: WorkerInfo[]
): void {
  assertWorkerWorkspace(worker, task.workspace_id);

  const currentTaskId = getWorkerCurrentTaskId(worker);
  if (currentTaskId && currentTaskId !== task.task_id) {
    throw new Error(`Worker ${worker.id} already owns active task ${currentTaskId}.`);
  }

  if (task.status !== TASK_STATUS.ACTIVE) {
    throw new Error(`Task ${task.task_id} must be active before assignment. Current status: ${task.status}.`);
  }

  if (task.assigned_worker_id && task.assigned_worker_id !== worker.id) {
    throw new Error(`Task ${task.task_id} is already assigned to worker ${task.assigned_worker_id}.`);
  }

  const otherOwner = workers.find(other =>
    other.id !== worker.id &&
    other.status !== WORKER_STATUS.DISCONNECTED &&
    getWorkerCurrentTaskId(other) === task.task_id
  );

  if (otherOwner) {
    throw new Error(`Task ${task.task_id} is already owned by worker ${otherOwner.id}.`);
  }
}
