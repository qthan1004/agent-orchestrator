import type { RuntimeBackendProfile, RuntimeIdentity, RuntimeIsolationProfile } from '../../runtime/models.js';
import type { OLLAMA_RUNTIME_ISOLATION } from './constants.js';

export type OllamaRuntimeIsolation = (typeof OLLAMA_RUNTIME_ISOLATION)[keyof typeof OLLAMA_RUNTIME_ISOLATION];

export interface OllamaRuntimeLease {
  identity: RuntimeIdentity;
  backend: RuntimeBackendProfile;
  isolation: RuntimeIsolationProfile;
  ollama_base_url: string;
  isolation_mode: OllamaRuntimeIsolation;
}
