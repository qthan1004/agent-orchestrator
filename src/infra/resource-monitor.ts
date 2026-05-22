import os from 'node:os';
import {
  INFRA_RESOURCE_MONITOR_DEFAULT_INTERVAL_MS,
  INFRA_RESOURCE_MONITOR_TEXT,
} from './constants.js';
import type {
  InfraCpuSnapshot,
  InfraMemorySnapshot,
  InfraOllamaSnapshot,
  InfraResourceMonitorDeps,
  InfraResourceSnapshot,
} from './models.js';

export class InfraResourceMonitor {
  private latest: InfraResourceSnapshot | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: InfraResourceMonitorDeps) {}

  getLatest(): InfraResourceSnapshot | null {
    return this.latest;
  }

  async collect(): Promise<InfraResourceSnapshot> {
    const [ollama, vram] = await Promise.all([
      this.collectOllama(),
      Promise.resolve(this.deps.getVramStatus()),
    ]);

    const snapshot: InfraResourceSnapshot = {
      checked_at: new Date().toISOString(),
      uptime_seconds: this.deps.getUptimeSeconds(),
      dispatch_loop: this.deps.getDispatchLoopStatus(),
      queue: this.deps.getQueueStatus(),
      active_workers: this.deps.getActiveWorkers(),
      capacity: this.deps.verifyCapacity?.(),
      ollama,
      vram,
      ram: this.collectRam(),
      cpu: this.collectCpu(),
    };

    this.latest = snapshot;
    return snapshot;
  }

  start(
    intervalMs: number = INFRA_RESOURCE_MONITOR_DEFAULT_INTERVAL_MS,
    onSnapshot?: (snapshot: InfraResourceSnapshot) => void
  ): void {
    this.stop();

    void this.collectAndEmit(onSnapshot);
    this.timer = setInterval(() => {
      void this.collectAndEmit(onSnapshot);
    }, intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async collectOllama(): Promise<InfraOllamaSnapshot> {
    let healthy = false;
    let loaded_models: string[] = [];
    let error: string | undefined;

    try {
      healthy = await this.deps.checkOllamaHealth();
    } catch (err) {
      error = this.errorMessage(err);
    }

    try {
      loaded_models = await this.deps.listOllamaModels();
    } catch (err) {
      error = error ?? this.errorMessage(err);
    }

    return { healthy, loaded_models, error };
  }

  private collectRam(): InfraMemorySnapshot {
    const total_mb = Math.round(os.totalmem() / 1024 / 1024);
    const free_mb = Math.round(os.freemem() / 1024 / 1024);
    const used_mb = Math.max(0, total_mb - free_mb);
    return {
      used_mb,
      total_mb,
      percentage: total_mb > 0 ? (used_mb / total_mb) * 100 : 0,
    };
  }

  private collectCpu(): InfraCpuSnapshot {
    const [load_1m, load_5m, load_15m] = os.loadavg();
    return {
      load_1m,
      load_5m,
      load_15m,
      cores: os.cpus().length,
    };
  }

  private async collectAndEmit(onSnapshot?: (snapshot: InfraResourceSnapshot) => void): Promise<void> {
    try {
      const snapshot = await this.collect();
      onSnapshot?.(snapshot);
    } catch (err) {
      console.warn(INFRA_RESOURCE_MONITOR_TEXT.SNAPSHOT_FAILED(this.errorMessage(err)));
    }
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : INFRA_RESOURCE_MONITOR_TEXT.UNKNOWN_ERROR;
  }
}

export function resolveInfraResourceMonitorIntervalMs(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : INFRA_RESOURCE_MONITOR_DEFAULT_INTERVAL_MS;
}
