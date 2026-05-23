export interface PlannerWorkflowPaths {
  preflight: string;
  create_plan: string;
  create_tasks: string;
}

export interface PlannerInfo {
  id: string;
  workspace_id: string;
  role: 'planner';
  registered_at: string;
  last_heartbeat: string;
  status: 'active' | 'disconnected';
  workflow_paths: PlannerWorkflowPaths;
  plans_created: number;
  tasks_created: number;
  last_plan_file?: string;
  last_ready_at?: string;
  disconnected_at?: string;
}
