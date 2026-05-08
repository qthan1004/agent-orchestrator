export type PlanStatus = 'ready' | 'busy' | 'idle';

export interface PlanCheckResult {
  status: PlanStatus;
  current: string | null;
  plan_path?: string;
  content?: string | null;
  pending_count: number;
}

export interface PlanQuickStatus {
  hasPending: boolean;
  hasProcessing: boolean;
  pendingCount: number;
  processingCount: number;
}
