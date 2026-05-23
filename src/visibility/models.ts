export type VisibilityEventKind = 'snapshot' | 'status' | 'warning' | 'error';

export interface VisibilityEvent {
  kind: VisibilityEventKind;
  message: string;
  created_at: string;
  details?: Record<string, unknown>;
}

export interface VisibilityResourceTableRow {
  resource: string;
  status: string;
  details: string;
}

export type RuntimeLifecycleStream = 'stdout' | 'stderr' | 'wrapper';

export interface RuntimeLifecycleTerminalEvent {
  task_id: string;
  worker_id: string;
  runtime_id: string;
  lease_generation: number;
  backend: string;
  phase: string;
  message: string;
  stream: RuntimeLifecycleStream;
  created_at: string;
}
