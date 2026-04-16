export interface TaskDef {
  id: string;
  module: string;
  action: string;
  verification: string;
  status?: string;
}

export interface TaskResult {
  task_id: string;
  status: string;
  summary: string;
  worker_id: string;
  completed_at: string;
}

export interface TaskGroup {
  group_id: number | string;
  tasks: string[];
  depends_on?: (number | string)[];
}

export interface TaskGraph {
  groups: TaskGroup[];
}
