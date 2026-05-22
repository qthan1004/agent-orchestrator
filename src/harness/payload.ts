import type { AssignmentEnvelope } from '../scheduler/index.js';
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
  ollama_base_url?: string;
  model: string;
  allowed_tools: string[];
  target_files: string[];
  skill_paths: string[];
  context_paths: string[];
  action: string;
  module: string;
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
  const runtimeId = optionalString(raw.runtime_id)
    || optionalString((raw.runtime_identity as Record<string, unknown> | undefined)?.runtime_id)
    || optionalString(assignment?.runtime_identity?.runtime_id);
  const leaseGeneration = optionalNumber(raw.lease_generation)
    ?? optionalNumber((raw.runtime_identity as Record<string, unknown> | undefined)?.lease_generation)
    ?? optionalNumber(assignment?.runtime_identity?.lease_generation);

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
    ollama_base_url: optionalString(raw.ollama_base_url),
    model: requiredString(raw.model, 'model'),
    allowed_tools: stringArray(raw.allowed_tools),
    target_files: targetFiles,
    skill_paths: stringArray(raw.skill_paths, metadataStringArray(assignment, 'skill_paths')),
    context_paths: stringArray(raw.context_paths, metadataStringArray(assignment, 'context_paths')),
    action: optionalString(raw.action) || 'implement',
    module: optionalString(raw.module) || optionalString(assignment?.payload?.module) || '',
    handover_context: optionalHandover(raw.handover_context),
    assignment
  };
}
