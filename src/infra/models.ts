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

export interface InfraWarmModelCacheSnapshot {
  key: {
    backend: string;
    model: string;
    endpoint_url?: string;
  };
  runtime_id?: string;
  loaded_at: string;
  last_used_at: string;
  expires_at: string;
  retained: boolean;
}

export interface InfraWorkerSnapshot {
  worker_id: string;
  task_id?: string;
  pid: number;
  started_at: string;
  runtime_id?: string;
  lease_generation?: number;
  model?: string;
  backend?: string;
  ready?: boolean;
  phase?: string;
  message?: string;
  current_tool?: string;
  current_file?: string;
  tool_call_count?: number;
  context_usage?: {
    used: number;
    limit: number;
    percent: number;
  };
  activity_updated_at?: string;
  visible_terminal?: boolean;
}

export interface InfraResourceSnapshot {
  checked_at: string;
  uptime_seconds: number;
  dispatch_loop: InfraDispatchLoopStatus;
  queue: InfraQueueSnapshot;
  active_workers: InfraWorkerSnapshot[];
  capacity?: VerifiedInfraCapacity;
  warm_model_cache?: InfraWarmModelCacheSnapshot[];
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
  verifyCapacity?(): VerifiedInfraCapacity;
  getWarmModelCache?(): InfraWarmModelCacheSnapshot[];
}

export interface InfraCapacityResourceEstimate {
  resource: 'vram' | 'ram' | 'cpu' | 'worker_slot';
  amount: number;
  unit: 'mb' | 'cores' | 'count';
}

export interface InfraCapacitySnapshot {
  checked_at: string;
  available_worker_slots: number;
  available_vram_mb?: number;
  available_ram_mb: number;
  cpu_load_1m: number;
}

export interface InfraCapacityRequest {
  worker_slots: number;
  estimated_vram_mb?: number;
  estimated_ram_mb?: number;
  estimated_cpu_cores?: number;
}

export interface VerifiedInfraCapacity {
  provider: 'local-gpu' | 'local-cpu' | 'cli' | 'cloud';
  total_vram_mb?: number;
  available_vram_mb?: number;
  total_ram_mb?: number;
  available_ram_mb?: number;
  max_local_runtimes: number;
  supported_backends: string[];
  checked_at: string;
}
