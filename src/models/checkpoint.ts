export type TaskPhase = 'pre-flight' | 'implementation' | 'verification' | 'done';

export interface CheckpointErrorContext {
  error: string;
  hypothesis: string;
  attempted_fix: string;
}

export interface CheckpointTokenUsage {
  used: number;
  limit: number;
}

export interface UnifiedCheckpoint {
  task_id: string;
  phase: TaskPhase;
  files_changed: string[];
  completed_steps: string[];
  remaining_steps: string[];
  error_context: CheckpointErrorContext | null;
  token_usage?: CheckpointTokenUsage;
}
