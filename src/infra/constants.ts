export const INFRA_RESOURCE_MONITOR_DEFAULT_INTERVAL_MS = 10_000 as const;

export const INFRA_RESOURCE_MONITOR_ENV = {
  TABLE_INTERVAL_MS: 'ORCHESTRATOR_RESOURCE_TABLE_MS',
} as const;

export const INFRA_RESOURCE_MONITOR_TEXT = {
  UNKNOWN_ERROR: 'unknown error',
  SNAPSHOT_FAILED: (error: string) => `[InfraResourceMonitor] Failed to collect snapshot: ${error}`,
} as const;
