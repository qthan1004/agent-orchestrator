import {
  RUNTIME_BACKEND,
  RUNTIME_ISOLATION,
} from '../../runtime/constants.js';
import type {
  RuntimeBackendProfile,
  RuntimeIdentity,
  RuntimeIsolationProfile,
} from '../../runtime/models.js';
import {
  OLLAMA_RUNTIME_DEFAULTS,
  OLLAMA_RUNTIME_ENV,
  OLLAMA_RUNTIME_ISOLATION,
} from './constants.js';
import type { OllamaRuntimeLease } from './models.js';

export function isSharedOllamaDevFallback(): boolean {
  return process.env[OLLAMA_RUNTIME_ENV.ISOLATION] !== '1';
}

export class OllamaRuntime {
  constructor(private readonly sharedBaseUrl: string = OLLAMA_RUNTIME_DEFAULTS.SHARED_BASE_URL) {}

  prepareLease(identity: RuntimeIdentity, backend: RuntimeBackendProfile, workspaceRoot: string): OllamaRuntimeLease {
    if (backend.backend !== RUNTIME_BACKEND.OLLAMA) {
      throw new Error(`Unsupported Ollama runtime backend: ${backend.backend}`);
    }

    const ollama_base_url = isSharedOllamaDevFallback()
      ? this.sharedBaseUrl.replace(/\/$/, '')
      : this.getIsolatedBaseUrl(identity);
    const isolation_mode = isSharedOllamaDevFallback()
      ? OLLAMA_RUNTIME_ISOLATION.SHARED_DEV_FALLBACK
      : OLLAMA_RUNTIME_ISOLATION.ISOLATED;
    const isolation: RuntimeIsolationProfile = {
      mode: isSharedOllamaDevFallback()
        ? RUNTIME_ISOLATION.SHARED_DEV
        : RUNTIME_ISOLATION.LEASE_LOCAL,
      workspace_root: workspaceRoot,
    };

    return {
      identity,
      backend: {
        ...backend,
        endpoint_url: ollama_base_url,
      },
      isolation,
      ollama_base_url,
      isolation_mode,
    };
  }

  releaseLease(_identity: RuntimeIdentity): void {
    // Isolated process cleanup will live here when private Ollama serve is enabled.
  }

  private getIsolatedBaseUrl(identity: RuntimeIdentity): string {
    const basePort = Number(process.env[OLLAMA_RUNTIME_ENV.BASE_PORT] || OLLAMA_RUNTIME_DEFAULTS.ISOLATED_BASE_PORT);
    const offset = Math.abs(this.hash(identity.runtime_id)) % 1000;
    return `http://127.0.0.1:${basePort + offset}`;
  }

  private hash(value: string): number {
    let result = 0;
    for (const char of value) {
      result = ((result << 5) - result) + char.charCodeAt(0);
      result |= 0;
    }
    return result;
  }
}
