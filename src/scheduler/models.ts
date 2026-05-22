import type {
  AssignmentEnvelope,
  AssignmentPayload,
  AssignTaskRequest,
  DispatchRoutingMetadata,
  WorkspaceScopedContext,
} from '../models/assignment.js';
import type { RuntimeIdentity } from '../runtime/index.js';
import type { TaskDef } from '../task/index.js';
import type { SCHEDULER_DECISION, SCHEDULER_WAIT_REASON } from './constants.js';

export type SchedulerDecisionKind = (typeof SCHEDULER_DECISION)[keyof typeof SCHEDULER_DECISION];
export type SchedulerWaitReason = (typeof SCHEDULER_WAIT_REASON)[keyof typeof SCHEDULER_WAIT_REASON];

export type SchedulerRoutingProfile = DispatchRoutingMetadata;

export interface SchedulerQueueStatus {
  total: number;
  pending: number;
  active: number;
  done: number;
  failed: number;
  blocked: number;
}

export type {
  AssignmentEnvelope,
  AssignmentPayload,
  AssignTaskRequest,
  DispatchRoutingMetadata,
  WorkspaceScopedContext,
};

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
