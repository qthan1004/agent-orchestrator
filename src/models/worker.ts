export interface WorkerInfo {
  id: string;
  workspace_id: string;
  role: string | null;
  registered_at: string;
  last_heartbeat: string;
  current_task_id: string | null;
  current_task: string | null;
  tasks_completed: number;
  status: string;
  disconnected_at?: string;
}
