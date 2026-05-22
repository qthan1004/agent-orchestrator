import type { WorkspaceScopedContext } from '../models/assignment.js';
import type { RuntimeIdentity } from '../runtime/index.js';
import type { TaskDef } from '../task/index.js';
import type { SCHEDULER_DECISION, SCHEDULER_WAIT_REASON } from './constants.js';

export type SchedulerDecisionKind = (typeof SCHEDULER_DECISION)[keyof typeof SCHEDULER_DECISION];
export type SchedulerWaitReason = (typeof SCHEDULER_WAIT_REASON)[keyof typeof SCHEDULER_WAIT_REASON];

export interface SchedulerRoutingProfile {
  mode: 'lite' | 'standard' | 'cloud';
  model: string;
  max_workers: number;
  estimated_vram_gb: number;
  backend?: 'ollama' | 'codex-cli' | 'ag-cli';
  points_required?: number;
}

export interface SchedulerQueueStatus {
  total: number;
  pending: number;
  active: number;
  done: number;
  failed: number;
  blocked: number;
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

export type DispatchRoutingMetadata = SchedulerRoutingProfile;

export interface AssignmentEnvelope {
  operation: 'assign_task';
  worker_id: string;
  task_id: string;
  runtime_identity: RuntimeIdentity;
  workspace: WorkspaceScopedContext;
  payload: AssignmentPayload;
  routing: DispatchRoutingMetadata;
  assigned_at: string;
}

export interface AssignTaskRequest {
  worker_id: string;
  task_id: string;
  payload: AssignmentPayload;
}

export interface SchedulerDispatchCandidate {
  task: TaskDef;
  queue_status: SchedulerQueueStatus;
}

export type SchedulerDecision =
  | {
      decision: typeof SCHEDULER_DECISION.DISPATCH;
      task_id: string;
      routing: SchedulerRoutingProfile;
    }
  | {
      decision: typeof SCHEDULER_DECISION.WAIT;
      reason: SchedulerWaitReason;
    }
  | {
      decision: typeof SCHEDULER_DECISION.BLOCK;
      task_id: string;
      reason: string;
    };
