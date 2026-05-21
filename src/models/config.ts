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

export interface WorkspaceRegistryConfig {
  base: string;
  workspace: string;
  workers: string;
  tasks: string;
}

export interface WorkspaceResultsConfig {
  base: string;
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

/**
 * Workspace-local memory configuration.
 * All paths are workspace-scoped by default.
 */
export interface WorkspaceMemoryConfig {
  /** Base directory for all workspace memory (e.g. ~/.orchestrator/workspaces/<id>/memory) */
  base: string;
  /** Workspace-local case bank root (e.g. ~/.orchestrator/workspaces/<id>/memory/case-bank) */
  caseBank: string;
}

/**
 * Global shared memory configuration.
 * Explicitly separated from workspace-local memory.
 */
export interface SharedMemoryConfig {
  /** Global case bank root (e.g. ~/.orchestrator/shared/case-bank) */
  caseBank: string;
}

export interface GlobalConfig {
  server: ServerConfig;
  polling: PollingConfig;
  recovery: RecoveryConfig;
  templates: string;
  /** Explicitly separated global/shared memory paths */
  sharedMemory: SharedMemoryConfig;
}

export interface WorkspaceConfig {
  workspaceId: string;
  /** Absolute path to the workspace root. Required — no implicit workspace discovery. */
  workspaceRoot: string;
  /** Workspace-local orchestration root: <workspace>/.orchestrator */
  orchestratorRoot: string;
  registry: WorkspaceRegistryConfig;
  exchange: ExchangeConfig;
  plans: DirConfig;
  tasks: DirConfig;
  planWatcher: PlanWatcherConfig;
  results: WorkspaceResultsConfig;
  /** Workspace-local memory paths */
  memory: WorkspaceMemoryConfig;
}

export interface AppConfig {
  root: string;
  runtimeRoot: string;
  profile: 'hybrid';
  global: GlobalConfig;
  workspace: WorkspaceConfig;
}

export interface ConfigOverrides {
  root?: string;
  runtimeRoot?: string;
  /** Workspace root is required at startup. No implicit workspace discovery. */
  workspaceRoot?: string;
  profile?: 'hybrid';
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
