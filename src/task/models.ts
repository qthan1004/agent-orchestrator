import type { TaskStatusValue } from './constants.js';

export interface TaskDef {
  id: string;
  module: string;
  action: string;
  verification: string;
  status?: TaskStatusValue;
  retry_count?: number;
  [key: string]: unknown;
}

export interface TaskResult {
  task_id: string;
  status: TaskStatusValue;
  summary: string;
  worker_id: string;
  completed_at: string;
}

export interface TaskIdentityRecord {
  task_id: string;
  workspace_id: string;
  task_content_path: string;
  status: TaskStatusValue;
  assigned_worker_id: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  retry_count?: number;
}

export interface TaskGroup {
  group_id: number | string;
  tasks: string[];
  depends_on?: (number | string)[];
}

export interface TaskGraph {
  groups: TaskGroup[];
}

export interface WorkerServiceHandoverRecord {
  task_id: string;
  worker_id: string;
  runtime_id: string;
  lease_generation: number;
  attempt: number;
  order: number;
  summary: string;
  open_questions: string[];
  modified_files: string[];
  next_action: string;
  content: string;
  created_at: string;
}
