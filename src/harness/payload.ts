import type { AssignmentEnvelope } from '../models/assignment.js';

export const DEFAULT_TOOL_BUNDLE = 'generic-file' as const;

export interface HarnessPayload {
  workspace_id: string;
  worker_id: string;
  task_id: string;
  workspace_root: string;
  task_file_path?: string;
  task_details?: string;
  tool_bundle: string;
  callback_url: string;
  model: string;
  allowed_tools: string[];
  target_files: string[];
  skill_paths: string[];
  context_paths: string[];
  action: string;
  module: string;
  handover_context?: string;
  assignment?: AssignmentEnvelope;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
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
    throw new Error('callback_url must be provided.');
  }

  const workspaceId = optionalString(raw.workspace_id)
    || optionalString(assignment?.workspace?.workspace_id)
    || optionalString(assignment?.payload?.workspace?.workspace_id);

  if (!workspaceId) {
    throw new Error('workspace_id must be provided.');
  }

  const targetFiles = stringArray(raw.target_files, metadataStringArray(assignment, 'target_files'));

  const taskFilePath = optionalString(raw.task_file_path);
  const taskDetails = optionalString(raw.task_details);
  if (!taskFilePath && !taskDetails) {
    throw new Error('task_file_path must be provided unless legacy task_details is present.');
  }

  return {
    workspace_id: workspaceId,
    worker_id: requiredString(raw.worker_id, 'worker_id'),
    task_id: requiredString(raw.task_id, 'task_id'),
    workspace_root: requiredString(raw.workspace_root, 'workspace_root'),
    task_file_path: taskFilePath,
    task_details: taskDetails,
    tool_bundle: optionalString(raw.tool_bundle) || DEFAULT_TOOL_BUNDLE,
    callback_url: callbackUrl,
    model: requiredString(raw.model, 'model'),
    allowed_tools: stringArray(raw.allowed_tools),
    target_files: targetFiles,
    skill_paths: stringArray(raw.skill_paths, metadataStringArray(assignment, 'skill_paths')),
    context_paths: stringArray(raw.context_paths, metadataStringArray(assignment, 'context_paths')),
    action: optionalString(raw.action) || 'implement',
    module: optionalString(raw.module) || optionalString(assignment?.payload?.module) || '',
    handover_context: optionalString(raw.handover_context),
    assignment
  };
}
