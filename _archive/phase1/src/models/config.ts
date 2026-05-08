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

export interface AppConfig {
  root: string;
  workspaceRoot: string | null;
  exchange: ExchangeConfig;
  templates: string;
  plans: DirConfig;
  tasks: DirConfig;
  server: ServerConfig;
  planWatcher: PlanWatcherConfig;
  polling: PollingConfig;
  recovery: RecoveryConfig;
}

export interface ConfigOverrides {
  root?: string;
  workspaceRoot?: string | null;
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
