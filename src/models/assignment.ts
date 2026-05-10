export const ASSIGNMENT_CONTRACT_MODE = "assignment-first" as const;

export const ASSIGNMENT_OPERATIONS = {
  REGISTER_WORKER: "register_worker",
  ASSIGN_TASK: "assign_task",
  ACK_ASSIGNMENT: "ack_assignment",
  REPORT_PROGRESS: "report_progress",
  COMPLETE_TASK: "complete_task",
} as const;

export type AssignmentOperationName =
  (typeof ASSIGNMENT_OPERATIONS)[keyof typeof ASSIGNMENT_OPERATIONS];

export const ASSIGNMENT_OWNERSHIP_RULES = [
  "Orchestrator owns assignment decisions and task state transitions.",
  "Workers cannot fetch arbitrary next tasks from the queue.",
  "Workers may only acknowledge, report progress on, and complete their currently assigned task.",
  "Assignment payloads must carry workspace-scoped context before execution starts.",
] as const;

export const ASSIGNMENT_STATE = {
  REGISTERED: "registered",
  ASSIGNED: "assigned",
  ACKNOWLEDGED: "acknowledged",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  BLOCKED: "blocked",
} as const;

export type AssignmentStateValue =
  (typeof ASSIGNMENT_STATE)[keyof typeof ASSIGNMENT_STATE];

export const ASSIGNMENT_STATE_TRANSITIONS = {
  register_worker: [ASSIGNMENT_STATE.REGISTERED],
  assign_task: [ASSIGNMENT_STATE.ASSIGNED],
  ack_assignment: [ASSIGNMENT_STATE.ACKNOWLEDGED],
  report_progress: [ASSIGNMENT_STATE.IN_PROGRESS],
  complete_task: [
    ASSIGNMENT_STATE.COMPLETED,
    ASSIGNMENT_STATE.FAILED,
    ASSIGNMENT_STATE.BLOCKED,
  ],
} as const satisfies Record<AssignmentOperationName, readonly AssignmentStateValue[]>;

export interface WorkerCapabilities {
  languages?: string[];
  frameworks?: string[];
  tools?: string[];
  domains?: string[];
  [key: string]: unknown;
}

export interface WorkerCapacity {
  max_concurrent_tasks: number;
  max_task_tokens?: number;
  max_context_window?: number;
  [key: string]: unknown;
}

export interface WorkspaceScopedContext {
  workspace_id: string;
  workspace_path: string;
  exchange_root?: string;
  plan_root?: string;
  constraints?: string[];
  references?: string[];
  [key: string]: unknown;
}

export interface RegisterWorkerRequest {
  workspace_path: string;
  capabilities?: WorkerCapabilities;
  capacity?: WorkerCapacity;
}

export interface RegisterWorkerResponse {
  worker_id: string;
  workspace_id: string;
  workspace_root: string;
  server_root: string;
  queue_summary: Record<string, unknown>;
  contract_mode: typeof ASSIGNMENT_CONTRACT_MODE;
}

export interface AssignmentPayload {
  task_id: string;
  module?: string;
  action: string;
  verification?: string;
  workspace: WorkspaceScopedContext;
  done_criteria?: string[];
  metadata?: Record<string, unknown>;
}

export interface AssignTaskRequest {
  worker_id: string;
  task_id: string;
  payload: AssignmentPayload;
}

export interface AckAssignmentRequest {
  worker_id: string;
  task_id: string;
}

export interface ReportProgressRequest {
  worker_id: string;
  task_id: string;
  step: string;
  percentage: number;
}

export interface CompleteTaskRequest {
  worker_id: string;
  task_id: string;
  status: "done" | "failed" | "blocked";
  summary: string;
}

export const ASSIGNMENT_CANONICAL_CONTRACT = {
  mode: ASSIGNMENT_CONTRACT_MODE,
  operations: ASSIGNMENT_OPERATIONS,
  ownership_rules: ASSIGNMENT_OWNERSHIP_RULES,
  state_transitions: ASSIGNMENT_STATE_TRANSITIONS,
  excluded_legacy_behaviors: [
    "get_next_task",
    "auto-pickup on completion",
    "worker-driven queue polling",
  ],
} as const;
