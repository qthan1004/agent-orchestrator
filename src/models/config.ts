export interface ExchangeConfig {
  base: string;
  inbox: string;
  active: string;
  outbox: string;
  checkpoints: string;
  logs: string;
  signals: string;
}

export interface DirConfig {
  base: string;
  pending: string;
  processing: string;
  done: string;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface PlanWatcherConfig {
  intervalMs: number;
}

export interface PollingConfig {
  pollTimeoutMs: number;
  checkIntervalMs: number;
  planPollTimeoutMs: number;
}

export interface RecoveryConfig {
  staleWorkerThresholdMs: number;
  plannerAliveThresholdMs: number;
  maxTaskRetries: number;
}

export interface GlobalConfig {
  server: ServerConfig;
  polling: PollingConfig;
  recovery: RecoveryConfig;
  templates: string;
}

export interface WorkspaceConfig {
  workspaceId: string;
  workspaceRoot: string | null;
  exchange: ExchangeConfig;
  plans: DirConfig;
  tasks: DirConfig;
  planWatcher: PlanWatcherConfig;
}

export interface AppConfig {
  root: string;
  runtimeRoot: string;
  profile: 'default' | 'hybrid';
  global: GlobalConfig;
  workspace: WorkspaceConfig;
}

export interface ConfigOverrides {
  root?: string;
  runtimeRoot?: string;
  workspaceRoot?: string | null;
  profile?: 'default' | 'hybrid';
  port?: number;
  host?: string;
  planWatcherIntervalMs?: number;
  pollTimeoutMs?: number;
  checkIntervalMs?: number;
  planPollTimeoutMs?: number;
  staleWorkerThresholdMs?: number;
  plannerAliveThresholdMs?: number;
  maxTaskRetries?: number;
}
