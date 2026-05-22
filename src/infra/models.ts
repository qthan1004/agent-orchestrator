export type InfraDispatchLoopStatus = 'running' | 'stopped';

export interface InfraQueueSnapshot {
  total: number;
  pending: number;
  active: number;
  done: number;
  failed: number;
  blocked: number;
}

export interface InfraVramSnapshot {
  available: boolean;
  used_mb?: number;
  total_mb?: number;
  percentage?: number;
  error?: string;
}

export interface InfraMemorySnapshot {
  used_mb: number;
  total_mb: number;
  percentage: number;
}

export interface InfraCpuSnapshot {
  load_1m: number;
  load_5m: number;
  load_15m: number;
  cores: number;
}

export interface InfraOllamaSnapshot {
  healthy: boolean;
  loaded_models: string[];
  error?: string;
}

export interface InfraWorkerSnapshot {
  worker_id: string;
  task_id?: string;
  pid: number;
  started_at: string;
}

export interface InfraResourceSnapshot {
  checked_at: string;
  uptime_seconds: number;
  dispatch_loop: InfraDispatchLoopStatus;
  queue: InfraQueueSnapshot;
  active_workers: InfraWorkerSnapshot[];
  ollama: InfraOllamaSnapshot;
  vram: InfraVramSnapshot;
  ram: InfraMemorySnapshot;
  cpu: InfraCpuSnapshot;
}

export interface InfraResourceMonitorDeps {
  getUptimeSeconds(): number;
  getDispatchLoopStatus(): InfraDispatchLoopStatus;
  getQueueStatus(): InfraQueueSnapshot;
  getActiveWorkers(): InfraWorkerSnapshot[];
  getVramStatus(): InfraVramSnapshot;
  checkOllamaHealth(): Promise<boolean>;
  listOllamaModels(): Promise<string[]>;
}
