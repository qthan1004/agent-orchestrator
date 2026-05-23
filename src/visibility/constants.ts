export const RESOURCE_TABLE_COLUMNS = {
  RESOURCE: 13,
  STATUS: 12,
  DETAILS: 64,
} as const;

export const RESOURCE_TABLE_TEXT = {
  TITLE: 'Infra Resources',
  HEADER_RESOURCE: 'Resource',
  HEADER_STATUS: 'Status',
  HEADER_DETAILS: 'Details',
  RESOURCE_SNAPSHOT: 'Snapshot',
  RESOURCE_DISPATCH: 'Dispatch',
  RESOURCE_QUEUE: 'Queue',
  RESOURCE_WORKER: 'Worker',
  RESOURCE_WORKERS: 'Workers',
  RESOURCE_CAPACITY: 'Capacity',
  RESOURCE_OLLAMA: 'Ollama',
  RESOURCE_VRAM: 'VRAM',
  RESOURCE_RAM: 'RAM',
  RESOURCE_CPU: 'CPU',
  RESOURCE_WARM_CACHE: 'WarmCache',
  UNAVAILABLE: 'unavailable',
  NONE: 'none',
  ONLINE: 'online',
  OFFLINE: 'offline',
  ACTIVE: 'active',
  IDLE: 'idle',
  RUNNING: 'running',
  STARTING: 'starting',
  STOPPED: 'stopped',
  WORK: 'work',
  USED: 'used',
  MODELS: 'models',
  COUNT: 'count',
  UNIT_MB: 'MB',
  LOAD: 'load',
  CORES: 'cores',
  PROVIDER: 'provider',
  RUNTIMES: 'runtimes',
  BACKENDS: 'backends',
  HOUR: 'h',
  MINUTE: 'm',
  SECOND: 's',
  QUEUE_PREFIX: 'p/a/d/f/b/t',
} as const;

export const LIFECYCLE_TERMINAL_TEXT = {
  PREFIX: (event: {
    task_id: string;
    runtime_id: string;
    lease_generation: number;
    backend: string;
    phase: string;
  }) => `[task=${event.task_id} runtime=${event.runtime_id} lease=${event.lease_generation} backend=${event.backend} phase=${event.phase}]`,
} as const;
