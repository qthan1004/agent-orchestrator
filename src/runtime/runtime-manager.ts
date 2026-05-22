import { EventEmitter } from 'events';
import type { InfraCapacityRequest } from '../infra/index.js';
import { CapacityStore } from '../infra/index.js';
import { OllamaAdapter } from '../worker/adapters/ollama-adapter.js';
import { WorkerProcessManager, type SpawnedWorker, type WorkerPayload } from '../worker/process-manager.js';
import { AgCliRuntime } from '../runtime-adapters/ag-cli/index.js';
import { CodexCliRuntime } from '../runtime-adapters/codex-cli/index.js';
import { OllamaRuntime } from '../runtime-adapters/ollama/index.js';
import {
  RUNTIME_BACKEND,
  RUNTIME_HEARTBEAT_STATUS,
  RUNTIME_ISOLATION,
  RUNTIME_LEASE_STATUS,
} from './constants.js';
import type {
  RuntimeBackendProfile,
  RuntimeHeartbeat,
  RuntimeIdentity,
  RuntimeIsolationProfile,
  RuntimeLeaseStatus,
} from './models.js';
import { HeartbeatStore } from './heartbeat-store.js';
import { PointAllocator } from './point-allocator.js';
import { RuntimeRegistry } from './runtime-registry.js';

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
  private readonly ollamaAdapter: OllamaAdapter;
  private readonly ollamaRuntime: OllamaRuntime;
  private readonly codexCliRuntime = new CodexCliRuntime();
  private readonly agCliRuntime = new AgCliRuntime();
  private readonly staleWorkerThresholdMs: number;
  private readonly workspaceRoot: string;

  constructor(options: RuntimeManagerOptions) {
    super();
    this.staleWorkerThresholdMs = options.staleWorkerThresholdMs;
    this.workspaceRoot = options.workspaceRoot;
    this.capacityStore = options.capacityStore ?? new CapacityStore();
    this.pointAllocator = new PointAllocator(this.capacityStore);
    this.ollamaAdapter = new OllamaAdapter(options.ollamaBaseUrl);
    this.ollamaRuntime = new OllamaRuntime(options.ollamaBaseUrl);
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
    if (backend.backend === RUNTIME_BACKEND.OLLAMA) {
      return await this.ollamaAdapter.health();
    }
    return true;
  }

  spawn(input: RuntimeSpawnInput): RuntimeSpawnResult {
    const runtimeIdentity = this.createRuntimeIdentity(input.worker_id, input.task_id, input.lease_generation);
    const ollamaLease = input.backend.backend === RUNTIME_BACKEND.OLLAMA
      ? this.ollamaRuntime.prepareLease(runtimeIdentity, input.backend, this.workspaceRoot)
      : null;
    const backend = ollamaLease?.backend ?? input.backend;
    const isolation = input.isolation ?? ollamaLease?.isolation ?? {
      mode: RUNTIME_ISOLATION.SHARED_DEV,
      workspace_root: this.workspaceRoot,
    };
    const lease = this.registry.createLease({
      identity: runtimeIdentity,
      backend,
      isolation,
      reserved_points: input.reserved_points,
    });
    this.pointAllocator.reserve(lease, input.capacity_request);
    this.heartbeatStore.recordHeartbeat(runtimeIdentity, this.staleWorkerThresholdMs);

    const spawned = this.processManager.spawn({
      ...input.payload,
      ollama_base_url: ollamaLease?.ollama_base_url,
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
    if (this.codexCliRuntime.isAlive(identity.runtime_id)) return true;
    if (this.agCliRuntime.isAlive(identity.runtime_id)) return true;
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
    this.ollamaRuntime.releaseLease(identity);
    this.codexCliRuntime.kill(identity.runtime_id);
    this.agCliRuntime.kill(identity.runtime_id);

    if (lease?.backend.backend === RUNTIME_BACKEND.OLLAMA && lease.backend.model) {
      const modelStillActiveOnEndpoint = this.registry.getActiveLeases()
        .some(activeLease =>
          activeLease.backend.model === lease.backend.model &&
          activeLease.backend.endpoint_url === lease.backend.endpoint_url
        );
      if (!modelStillActiveOnEndpoint) {
        const adapter = new OllamaAdapter(lease.backend.endpoint_url);
        await adapter.unload(lease.backend.model);
      }
    }
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
