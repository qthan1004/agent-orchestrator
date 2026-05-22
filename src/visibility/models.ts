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
