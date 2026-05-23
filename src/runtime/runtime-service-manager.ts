import { CapacityStore } from '../infra/index.js';
import { OllamaAdapter } from '../worker/adapters/ollama-adapter.js';
import { AgCliRuntime } from '../runtime-adapters/ag-cli/index.js';
import { CodexCliRuntime } from '../runtime-adapters/codex-cli/index.js';
import { OllamaRuntime } from '../runtime-adapters/ollama/index.js';
import {
  RUNTIME_BACKEND,
  RUNTIME_SERVICE_STATUS,
  RUNTIME_TERMINAL_CALLBACK_STATUS,
  WARM_MODEL_CACHE_DEFAULTS,
} from './constants.js';
import type {
  RuntimeBackendKind,
  RuntimeBackendProfile,
  RuntimeIdentity,
  RuntimeIsolationProfile,
  RuntimeServiceAdapter,
  RuntimeServiceCleanupInput,
  RuntimeServiceHandle,
  RuntimeServiceStartInput,
  RuntimeServiceStartResult,
  WarmModelCachePolicy,
} from './models.js';

function serviceHandleId(identity: RuntimeIdentity, backend: RuntimeBackendKind): string {
  return `${identity.runtime_id}:${backend}`;
}

function defaultWarmCachePolicy(): WarmModelCachePolicy {
  return {
    ttl_ms: WARM_MODEL_CACHE_DEFAULTS.TTL_MS,
    retain_on_release: WARM_MODEL_CACHE_DEFAULTS.RETAIN_ON_RELEASE,
    evict_on_pressure: true,
  };
}

class OllamaRuntimeServiceAdapter implements RuntimeServiceAdapter {
  readonly backend = RUNTIME_BACKEND.OLLAMA;

  constructor(
    private readonly ollamaRuntime: OllamaRuntime,
    private readonly capacityStore: CapacityStore
  ) {}

  start(input: RuntimeServiceStartInput): RuntimeServiceStartResult {
    const prepared = this.ollamaRuntime.prepareLease(input.identity, input.backend, input.workspace_root);
    const now = new Date().toISOString();
    const handle: RuntimeServiceHandle = {
      ...input.identity,
      backend: RUNTIME_BACKEND.OLLAMA,
      backend_session_id: serviceHandleId(input.identity, RUNTIME_BACKEND.OLLAMA),
      endpoint_url: prepared.ollama_base_url,
      model: prepared.backend.model,
      status: RUNTIME_SERVICE_STATUS.READY,
      isolation: prepared.isolation,
      started_at: now,
      updated_at: now,
      metadata: {
        isolation_mode: prepared.isolation_mode,
      },
    };
    return {
      handle,
      backend: prepared.backend,
      isolation: prepared.isolation,
      payload_patch: {
        ollama_base_url: prepared.ollama_base_url,
        backend_session_id: handle.backend_session_id,
      },
    };
  }

  probe(_handle: RuntimeServiceHandle): boolean {
    return true;
  }

  async cleanup(input: RuntimeServiceCleanupInput, handle: RuntimeServiceHandle): Promise<void> {
    this.ollamaRuntime.releaseLease(input.identity);
    const policy = input.warm_cache_policy ?? defaultWarmCachePolicy();
    if (handle.model && policy.retain_on_release && input.terminal_status !== RUNTIME_TERMINAL_CALLBACK_STATUS.FAILED) {
      const nowMs = Date.now();
      this.capacityStore.setWarmModelCacheEntry({
        key: {
          backend: handle.backend,
          model: handle.model,
          endpoint_url: handle.endpoint_url,
        },
        runtime_id: input.identity.runtime_id,
        loaded_at: handle.started_at,
        last_used_at: new Date(nowMs).toISOString(),
        expires_at: new Date(nowMs + policy.ttl_ms).toISOString(),
        retained: true,
      });
      return;
    }

    if (handle.model) {
      await new OllamaAdapter(handle.endpoint_url).unload(handle.model);
      this.capacityStore.evictWarmModelCache({
        backend: handle.backend,
        model: handle.model,
        endpoint_url: handle.endpoint_url,
      });
    }
  }
}

class CodexCliRuntimeServiceAdapter implements RuntimeServiceAdapter {
  readonly backend = RUNTIME_BACKEND.CODEX_CLI;

  constructor(private readonly runtime: CodexCliRuntime) {}

  start(input: RuntimeServiceStartInput): RuntimeServiceStartResult {
    const session = this.runtime.start({
      identity: input.identity,
      command: input.backend.command,
      args: input.backend.args,
    });
    const now = new Date().toISOString();
    const handle: RuntimeServiceHandle = {
      ...input.identity,
      backend: RUNTIME_BACKEND.CODEX_CLI,
      backend_session_id: serviceHandleId(input.identity, RUNTIME_BACKEND.CODEX_CLI),
      command: session.command,
      pid: session.pid,
      model: input.backend.model,
      status: RUNTIME_SERVICE_STATUS.READY,
      isolation: input.isolation,
      started_at: session.started_at,
      updated_at: now,
      metadata: {
        args: session.args,
      },
    };
    return {
      handle,
      backend: {
        ...input.backend,
        backend: RUNTIME_BACKEND.CODEX_CLI,
        command: session.command,
        args: session.args,
        session_id: handle.backend_session_id,
      },
      isolation: input.isolation,
      payload_patch: {
        backend_session_id: handle.backend_session_id,
      },
    };
  }

  probe(handle: RuntimeServiceHandle): boolean {
    return this.runtime.isAlive(handle.runtime_id);
  }

  cleanup(input: RuntimeServiceCleanupInput): void {
    this.runtime.kill(input.identity.runtime_id);
  }
}

class AgCliRuntimeServiceAdapter implements RuntimeServiceAdapter {
  readonly backend = RUNTIME_BACKEND.AG_CLI;

  constructor(private readonly runtime: AgCliRuntime) {}

  start(input: RuntimeServiceStartInput): RuntimeServiceStartResult {
    const session = this.runtime.start({
      identity: input.identity,
      command: input.backend.command,
      args: input.backend.args,
    });
    const now = new Date().toISOString();
    const handle: RuntimeServiceHandle = {
      ...input.identity,
      backend: RUNTIME_BACKEND.AG_CLI,
      backend_session_id: serviceHandleId(input.identity, RUNTIME_BACKEND.AG_CLI),
      command: session.command,
      pid: session.pid,
      model: input.backend.model,
      status: RUNTIME_SERVICE_STATUS.READY,
      isolation: input.isolation,
      started_at: session.started_at,
      updated_at: now,
      metadata: {
        args: session.args,
      },
    };
    return {
      handle,
      backend: {
        ...input.backend,
        backend: RUNTIME_BACKEND.AG_CLI,
        command: session.command,
        args: session.args,
        session_id: handle.backend_session_id,
      },
      isolation: input.isolation,
      payload_patch: {
        backend_session_id: handle.backend_session_id,
      },
    };
  }

  probe(handle: RuntimeServiceHandle): boolean {
    return this.runtime.isAlive(handle.runtime_id);
  }

  cleanup(input: RuntimeServiceCleanupInput): void {
    this.runtime.kill(input.identity.runtime_id);
  }
}

export interface RuntimeServiceManagerOptions {
  workspaceRoot: string;
  ollamaBaseUrl?: string;
  capacityStore?: CapacityStore;
}

export class RuntimeServiceManager {
  private readonly handles = new Map<string, RuntimeServiceHandle>();
  private readonly adapters = new Map<RuntimeBackendKind, RuntimeServiceAdapter>();
  private readonly capacityStore: CapacityStore;

  constructor(options: RuntimeServiceManagerOptions) {
    this.capacityStore = options.capacityStore ?? new CapacityStore();
    this.adapters.set(RUNTIME_BACKEND.OLLAMA, new OllamaRuntimeServiceAdapter(new OllamaRuntime(options.ollamaBaseUrl), this.capacityStore));
    this.adapters.set(RUNTIME_BACKEND.CODEX_CLI, new CodexCliRuntimeServiceAdapter(new CodexCliRuntime()));
    this.adapters.set(RUNTIME_BACKEND.AG_CLI, new AgCliRuntimeServiceAdapter(new AgCliRuntime()));
  }

  async start(input: RuntimeServiceStartInput): Promise<RuntimeServiceStartResult> {
    const adapter = this.getAdapter(input.backend.backend);
    const result = await adapter.start(input);
    this.handles.set(input.identity.runtime_id, result.handle);
    return result;
  }

  async isBackendHealthy(backend: RuntimeBackendProfile): Promise<boolean> {
    if (backend.backend === RUNTIME_BACKEND.OLLAMA) {
      return await new OllamaAdapter(backend.endpoint_url).health();
    }
    return true;
  }

  async probe(identity: RuntimeIdentity): Promise<boolean> {
    const handle = this.handles.get(identity.runtime_id);
    if (!handle) return false;
    return await this.getAdapter(handle.backend).probe(handle);
  }

  isAlive(identity: RuntimeIdentity): boolean {
    const handle = this.handles.get(identity.runtime_id);
    if (!handle) return false;
    if (handle.backend === RUNTIME_BACKEND.OLLAMA) return true;
    if (handle.backend === RUNTIME_BACKEND.CODEX_CLI) return Boolean(handle.pid);
    if (handle.backend === RUNTIME_BACKEND.AG_CLI) return Boolean(handle.pid);
    return false;
  }

  getHandle(runtimeId: string): RuntimeServiceHandle | null {
    return this.handles.get(runtimeId) ?? null;
  }

  async cleanup(input: RuntimeServiceCleanupInput): Promise<void> {
    const handle = this.handles.get(input.identity.runtime_id);
    if (!handle) return;
    this.handles.delete(input.identity.runtime_id);
    await this.getAdapter(handle.backend).cleanup(input, handle);
  }

  getWarmModelCache() {
    return this.capacityStore.getWarmModelCache();
  }

  private getAdapter(backend: RuntimeBackendKind): RuntimeServiceAdapter {
    const adapter = this.adapters.get(backend);
    if (!adapter) throw new Error(`No runtime service adapter for backend ${backend}.`);
    return adapter;
  }
}
