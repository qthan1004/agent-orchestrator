import type { AssignmentEnvelope } from '../scheduler/index.js';
import { RUNTIME_BACKEND } from '../runtime/constants.js';
import type { RuntimeBackendKind, RuntimeBackendProfile, RuntimeIdentity, WarmModelCachePolicy } from '../runtime/models.js';
import type { WorkerServiceHandoverRecord } from '../task/index.js';
import { PAYLOAD_TEXT } from './constants.js';

export const DEFAULT_TOOL_BUNDLE = 'generic-file' as const;

export interface HarnessPayload {
  workspace_id: string;
  worker_id: string;
  task_id: string;
  runtime_id: string;
  lease_generation: number;
  workspace_root: string;
  task_file_path?: string;
  task_details?: string;
  tool_bundle: string;
  callback_url: string;
  ready_url?: string;
  progress_url?: string;
  backend: RuntimeBackendProfile;
  backend_session_id?: string;
  ollama_base_url?: string;
  model: string;
  allowed_tools: string[];
  target_files: string[];
  skill_paths: string[];
  context_paths: string[];
  action: string;
  module: string;
  context_threshold?: number;
  warm_cache_policy?: WarmModelCachePolicy;
  handover_context?: WorkerServiceHandoverRecord | string;
  assignment?: AssignmentEnvelope;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(PAYLOAD_TEXT.OBJECT_REQUIRED(field));
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(PAYLOAD_TEXT.STRING_REQUIRED(field));
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function optionalHandover(value: unknown): WorkerServiceHandoverRecord | string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as WorkerServiceHandoverRecord;
  }
  return undefined;
}

function metadataStringArray(assignment: AssignmentEnvelope | undefined, key: string): string[] {
  const metadata = assignment?.payload?.metadata;
  if (!metadata || typeof metadata !== 'object') return [];
  return stringArray((metadata as Record<string, unknown>)[key]);
}

function parseRuntimeIdentity(raw: Record<string, unknown>, assignment: AssignmentEnvelope | undefined): Partial<RuntimeIdentity> {
  const rawIdentity = raw.runtime_identity && typeof raw.runtime_identity === 'object'
    ? raw.runtime_identity as Record<string, unknown>
    : {};
  return {
    runtime_id: optionalString(raw.runtime_id) || optionalString(rawIdentity.runtime_id) || optionalString(assignment?.runtime_identity?.runtime_id),
    worker_id: optionalString(raw.worker_id) || optionalString(rawIdentity.worker_id) || optionalString(assignment?.runtime_identity?.worker_id),
    task_id: optionalString(raw.task_id) || optionalString(rawIdentity.task_id) || optionalString(assignment?.runtime_identity?.task_id),
    lease_generation: optionalNumber(raw.lease_generation) ?? optionalNumber(rawIdentity.lease_generation) ?? optionalNumber(assignment?.runtime_identity?.lease_generation),
  };
}

function parseBackend(raw: Record<string, unknown>, model: string): RuntimeBackendProfile {
  const rawBackend = raw.backend && typeof raw.backend === 'object'
    ? raw.backend as Record<string, unknown>
    : {};
  const backend = optionalString(rawBackend.backend) || optionalString(raw.backend);
  const normalizedBackend = backend && Object.values(RUNTIME_BACKEND).includes(backend as RuntimeBackendKind)
    ? backend as RuntimeBackendKind
    : RUNTIME_BACKEND.OLLAMA;
  return {
    backend: normalizedBackend,
    model: optionalString(rawBackend.model) || model,
    endpoint_url: optionalString(rawBackend.endpoint_url) || optionalString(raw.ollama_base_url),
    command: optionalString(rawBackend.command),
    args: stringArray(rawBackend.args),
    session_id: optionalString(rawBackend.session_id) || optionalString(raw.backend_session_id),
  };
}

function parseWarmCachePolicy(value: unknown): WarmModelCachePolicy | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const ttlMs = optionalNumber(raw.ttl_ms);
  const retainOnRelease = optionalBoolean(raw.retain_on_release);
  const evictOnPressure = optionalBoolean(raw.evict_on_pressure);
  if (ttlMs === undefined || retainOnRelease === undefined || evictOnPressure === undefined) return undefined;
  return {
    ttl_ms: ttlMs,
    retain_on_release: retainOnRelease,
    evict_on_pressure: evictOnPressure,
  };
}

export function parseHarnessPayload(rawInput: string): HarnessPayload {
  return normalizeHarnessPayload(JSON.parse(rawInput));
}

export function normalizeHarnessPayload(input: unknown): HarnessPayload {
  const raw = asRecord(input, 'payload');
  const assignment = raw.assignment && typeof raw.assignment === 'object'
    ? raw.assignment as AssignmentEnvelope
    : undefined;

  const serverUrl = optionalString(raw.server_url);
  const callbackUrl = optionalString(raw.callback_url)
    || (serverUrl ? `${serverUrl.replace(/\/$/, '')}/api/worker/complete` : undefined);

  if (!callbackUrl) {
    throw new Error(PAYLOAD_TEXT.CALLBACK_URL_REQUIRED);
  }

  const workspaceId = optionalString(raw.workspace_id)
    || optionalString(assignment?.workspace?.workspace_id)
    || optionalString(assignment?.payload?.workspace?.workspace_id);

  if (!workspaceId) {
    throw new Error(PAYLOAD_TEXT.WORKSPACE_ID_REQUIRED);
  }

  const targetFiles = stringArray(raw.target_files, metadataStringArray(assignment, 'target_files'));
  const identity = parseRuntimeIdentity(raw, assignment);
  const runtimeId = identity.runtime_id;
  const leaseGeneration = identity.lease_generation;

  if (!runtimeId) {
    throw new Error(PAYLOAD_TEXT.RUNTIME_ID_REQUIRED);
  }
  if (typeof leaseGeneration !== 'number') {
    throw new Error(PAYLOAD_TEXT.LEASE_GENERATION_REQUIRED);
  }

  const taskFilePath = optionalString(raw.task_file_path);
  const taskDetails = optionalString(raw.task_details);
  if (!taskFilePath && !taskDetails) {
    throw new Error(PAYLOAD_TEXT.TASK_FILE_REQUIRED);
  }

  const model = requiredString(raw.model, 'model');
  const backend = parseBackend(raw, model);

  return {
    workspace_id: workspaceId,
    worker_id: requiredString(raw.worker_id, 'worker_id'),
    task_id: requiredString(raw.task_id, 'task_id'),
    runtime_id: runtimeId,
    lease_generation: leaseGeneration,
    workspace_root: requiredString(raw.workspace_root, 'workspace_root'),
    task_file_path: taskFilePath,
    task_details: taskDetails,
    tool_bundle: optionalString(raw.tool_bundle) || DEFAULT_TOOL_BUNDLE,
    callback_url: callbackUrl,
    ready_url: optionalString(raw.ready_url) || callbackUrl.replace(/\/complete$/, '/ready'),
    progress_url: optionalString(raw.progress_url) || callbackUrl.replace(/\/complete$/, '/progress'),
    backend,
    backend_session_id: optionalString(raw.backend_session_id) || backend.session_id,
    ollama_base_url: optionalString(raw.ollama_base_url),
    model,
    allowed_tools: stringArray(raw.allowed_tools),
    target_files: targetFiles,
    skill_paths: stringArray(raw.skill_paths, metadataStringArray(assignment, 'skill_paths')),
    context_paths: stringArray(raw.context_paths, metadataStringArray(assignment, 'context_paths')),
    action: optionalString(raw.action) || 'implement',
    module: optionalString(raw.module) || optionalString(assignment?.payload?.module) || '',
    context_threshold: optionalNumber(raw.context_threshold),
    warm_cache_policy: parseWarmCachePolicy(raw.warm_cache_policy),
    handover_context: optionalHandover(raw.handover_context),
    assignment
  };
}
