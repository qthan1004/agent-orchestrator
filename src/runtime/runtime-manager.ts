import { EventEmitter } from 'events';
import type { InfraCapacityRequest } from '../infra/index.js';
import { CapacityStore } from '../infra/index.js';
import { WorkerProcessManager, type SpawnedWorker, type WorkerPayload } from '../worker/process-manager.js';
import {
  RUNTIME_HEARTBEAT_STATUS,
  RUNTIME_ISOLATION,
  RUNTIME_LEASE_STATUS,
  RUNTIME_TERMINAL_CALLBACK_STATUS,
  WARM_MODEL_CACHE_DEFAULTS,
} from './constants.js';
import type {
  RuntimeBackendProfile,
  RuntimeHeartbeat,
  RuntimeIdentity,
  RuntimeIsolationProfile,
  RuntimeLeaseStatus,
  RuntimeTerminalCallbackStatus,
  WarmModelCachePolicy,
} from './models.js';
import { HeartbeatStore } from './heartbeat-store.js';
import { PointAllocator } from './point-allocator.js';
import { RuntimeRegistry } from './runtime-registry.js';
import { RuntimeServiceManager } from './runtime-service-manager.js';

export interface RuntimeManagerOptions {
  staleWorkerThresholdMs: number;
  workspaceRoot: string;
  ollamaBaseUrl?: string;
  capacityStore?: CapacityStore;
}

export interface RuntimeSpawnInput {
  worker_id: string;
  task_id: string;
  lease_generation: number;
  payload: WorkerPayload;
  backend: RuntimeBackendProfile;
  isolation?: RuntimeIsolationProfile;
  reserved_points: number;
  capacity_request: InfraCapacityRequest;
  warm_cache_policy?: WarmModelCachePolicy;
}

export interface RuntimeSpawnResult extends SpawnedWorker {
  runtimeIdentity: RuntimeIdentity;
}

export interface RuntimeHeartbeatEvent {
  worker_id: string;
  runtime_identity: RuntimeIdentity;
  heartbeat: RuntimeHeartbeat;
}

export class RuntimeManager extends EventEmitter {
  private readonly processManager: WorkerProcessManager;
  private readonly registry = new RuntimeRegistry();
  private readonly heartbeatStore = new HeartbeatStore();
  private readonly capacityStore: CapacityStore;
  private readonly pointAllocator: PointAllocator;
  private readonly serviceManager: RuntimeServiceManager;
  private readonly staleWorkerThresholdMs: number;
  private readonly workspaceRoot: string;

  constructor(options: RuntimeManagerOptions) {
    super();
    this.staleWorkerThresholdMs = options.staleWorkerThresholdMs;
    this.workspaceRoot = options.workspaceRoot;
    this.capacityStore = options.capacityStore ?? new CapacityStore();
    this.pointAllocator = new PointAllocator(this.capacityStore);
    this.serviceManager = new RuntimeServiceManager({
      workspaceRoot: options.workspaceRoot,
      ollamaBaseUrl: options.ollamaBaseUrl,
      capacityStore: this.capacityStore,
    });
    this.processManager = new WorkerProcessManager({
      staleWorkerThresholdMs: options.staleWorkerThresholdMs,
    });

    this.processManager.on('worker:heartbeat', ({ worker_id, runtime_identity }) => {
      if (!this.isRuntimeIdentity(runtime_identity)) return;
      const heartbeat = this.heartbeatStore.markHealthCheck(runtime_identity, this.staleWorkerThresholdMs);
      this.emit('runtime:heartbeat', { worker_id, runtime_identity, heartbeat } satisfies RuntimeHeartbeatEvent);
    });
  }

  async isBackendHealthy(backend: RuntimeBackendProfile): Promise<boolean> {
    return await this.serviceManager.isBackendHealthy(backend);
  }

  async spawn(input: RuntimeSpawnInput): Promise<RuntimeSpawnResult> {
    const runtimeIdentity = this.createRuntimeIdentity(input.worker_id, input.task_id, input.lease_generation);
    const baseIsolation = input.isolation ?? {
      mode: RUNTIME_ISOLATION.SHARED_DEV,
      workspace_root: this.workspaceRoot,
    };
    const service = await this.serviceManager.start({
      identity: runtimeIdentity,
      backend: input.backend,
      isolation: baseIsolation,
      workspace_root: this.workspaceRoot,
      warm_cache_policy: input.warm_cache_policy,
    });
    const lease = this.registry.createLease({
      identity: runtimeIdentity,
      backend: service.backend,
      isolation: service.isolation,
      reserved_points: input.reserved_points,
    });
    this.pointAllocator.reserve(lease, input.capacity_request);
    this.heartbeatStore.recordHeartbeat(runtimeIdentity, this.staleWorkerThresholdMs);

    const spawned = this.processManager.spawn({
      ...input.payload,
      ...service.payload_patch,
      backend: service.backend,
      runtime_identity: runtimeIdentity,
    });

    return {
      ...spawned,
      runtimeIdentity,
    };
  }

  getActiveWorkers(): ReturnType<WorkerProcessManager['getActive']> {
    return this.processManager.getActive();
  }

  isAlive(workerId: string): boolean {
    return this.getActiveWorkers().some(worker => worker.worker_id === workerId);
  }

  isRuntimeSessionAlive(identity: RuntimeIdentity): boolean {
    if (this.serviceManager.isAlive(identity)) return true;
    return this.getActiveWorkers().some(worker => worker.worker_id === identity.worker_id);
  }

  kill(pid: number): void {
    this.processManager.kill(pid);
  }

  async release(identity: RuntimeIdentity, status: RuntimeLeaseStatus = RUNTIME_LEASE_STATUS.RELEASED): Promise<void> {
    const lease = this.registry.get(identity.runtime_id);
    this.pointAllocator.release(identity);
    this.heartbeatStore.remove(identity.runtime_id);
    this.registry.release(identity.runtime_id, status);
    await this.serviceManager.cleanup({
      identity,
      terminal_status: lease?.terminal_callback_status ?? RUNTIME_TERMINAL_CALLBACK_STATUS.COMPLETE,
      warm_cache_policy: {
        ttl_ms: WARM_MODEL_CACHE_DEFAULTS.TTL_MS,
        retain_on_release: WARM_MODEL_CACHE_DEFAULTS.RETAIN_ON_RELEASE,
        evict_on_pressure: true,
      },
    });
  }

  markReady(identity: RuntimeIdentity): boolean {
    const lease = this.registry.markStatus(identity.runtime_id, RUNTIME_LEASE_STATUS.READY);
    return Boolean(lease);
  }

  markRunning(identity: RuntimeIdentity): boolean {
    const lease = this.registry.markStatus(identity.runtime_id, RUNTIME_LEASE_STATUS.RUNNING);
    return Boolean(lease);
  }

  acceptTerminalCallback(identity: RuntimeIdentity, status: RuntimeTerminalCallbackStatus): boolean {
    return Boolean(this.registry.acceptTerminalCallback(identity.runtime_id, status));
  }

  async probeRuntime(identity: RuntimeIdentity): Promise<boolean> {
    const ok = await this.serviceManager.probe(identity);
    this.heartbeatStore.markProbe(identity, ok);
    return ok;
  }

  getWarmModelCache() {
    return this.serviceManager.getWarmModelCache();
  }

  getHeartbeat(runtimeId: string): RuntimeHeartbeat | null {
    return this.heartbeatStore.get(runtimeId);
  }

  isStale(runtimeId: string): boolean {
    const heartbeat = this.heartbeatStore.get(runtimeId);
    return Boolean(heartbeat && heartbeat.status === RUNTIME_HEARTBEAT_STATUS.STALE);
  }

  private createRuntimeIdentity(workerId: string, taskId: string, leaseGeneration: number): RuntimeIdentity {
    return {
      runtime_id: `${workerId}:${taskId}:${leaseGeneration}`,
      worker_id: workerId,
      task_id: taskId,
      lease_generation: leaseGeneration,
    };
  }

  private isRuntimeIdentity(value: unknown): value is RuntimeIdentity {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<RuntimeIdentity>;
    return typeof candidate.runtime_id === 'string' &&
      typeof candidate.worker_id === 'string' &&
      typeof candidate.task_id === 'string' &&
      typeof candidate.lease_generation === 'number';
  }
}
