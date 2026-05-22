import fs from 'fs';
import path from 'path';
import { FILE_PREFIXES, TASK_STATUS } from '../constants.js';
import type { ServerContext } from '../mcp-server/context.js';
import type { TaskMetadata } from '../models/task-metadata.js';
import { parseTaskMetadata } from '../models/task-metadata.js';
import { assertActiveWorkspace } from '../utils/identity-invariants.js';
import { atomicWrite, writeJSON } from '../utils/file-backend.js';
import { WorkspaceRegistry } from '../utils/workspace-registry.js';

export interface TaskPayload {
  action: string;
  body: string;
  priority?: number;
  tool_bundle?: string;
  depends_on?: string[];
  target_files?: string[];
  read_files?: string[];
  skill_paths?: string[];
  context_paths?: string[];
}

export interface SubmitWorkspaceTaskInput {
  task_id: string;
  workspace_id: string;
  task_payload?: TaskPayload;
  task_content_path?: string;
}

export interface SubmitWorkspaceTaskResult {
  status: 'registered';
  task_id: string;
  task_content_path: string;
  materialized_by: 'server' | 'planner-file';
  target_files_count: number;
  depends_on_count: number;
}

interface ResolvedTaskContent {
  metadata: TaskMetadata;
  taskContentPath: string;
  resolvedTaskPath: string;
  materializedBy: SubmitWorkspaceTaskResult['materialized_by'];
  contentToWrite?: string;
}

export function submitWorkspaceTask(
  context: ServerContext,
  input: SubmitWorkspaceTaskInput
): SubmitWorkspaceTaskResult {
  if (input.workspace_id !== context.config.workspace.workspaceId) {
    throw new Error(`Workspace mismatch: expected ${context.config.workspace.workspaceId}, received ${input.workspace_id}`);
  }

  if (context.stateManager.queue.tasks.has(input.task_id)) {
    throw new Error(`Task "${input.task_id}" is already registered.`);
  }

  const registry = new WorkspaceRegistry(context.config.runtimeRoot);
  const workspace = registry.getById(input.workspace_id);
  if (!workspace) {
    throw new Error(`Workspace "${input.workspace_id}" not found in registry.`);
  }
  assertActiveWorkspace(workspace, input.workspace_id);

  const resolved = resolveTaskContent(workspace.path, input);

  if (resolved.contentToWrite) {
    if (fs.existsSync(resolved.resolvedTaskPath)) {
      throw new Error(`Task content already exists: ${resolved.taskContentPath}`);
    }
    if (!atomicWrite(resolved.resolvedTaskPath, resolved.contentToWrite)) {
      throw new Error(`Failed to write task content: ${resolved.taskContentPath}`);
    }
  }

  context.stateManager.taskRegistry.registerTask({
    task_id: resolved.metadata.task_id,
    workspace_id: resolved.metadata.workspace_id,
    task_content_path: resolved.metadata.task_content_path,
    status: TASK_STATUS.PENDING,
    created_at: resolved.metadata.created_at,
    retry_count: resolved.metadata.retry_count,
  });
  context.stateManager.queue.registerTaskMetadata(resolved.metadata);

  const taskFilePath = path.join(
    context.config.workspace.exchange.inbox,
    `${FILE_PREFIXES.TASK}${resolved.metadata.task_id}.json`
  );
  writeJSON(taskFilePath, resolved.metadata);

  const queuePath = path.join(context.config.workspace.exchange.base, FILE_PREFIXES.QUEUE);
  writeJSON(queuePath, { groups: context.stateManager.queue.groups });

  return {
    status: 'registered',
    task_id: resolved.metadata.task_id,
    task_content_path: resolved.metadata.task_content_path,
    materialized_by: resolved.materializedBy,
    target_files_count: resolved.metadata.target_files.length,
    depends_on_count: resolved.metadata.depends_on.length
  };
}

function resolveTaskContent(
  workspaceRoot: string,
  input: SubmitWorkspaceTaskInput
): ResolvedTaskContent {
  if (input.task_payload && input.task_content_path) {
    throw new Error('submit_task accepts either task_payload or task_content_path, not both.');
  }

  if (input.task_payload) {
    const taskContentPath = `.orchestrator/tasks/${safeTaskFileName(input.task_id)}.md`;
    const resolvedTaskPath = resolveWorkspaceTaskPath(workspaceRoot, taskContentPath);
    const content = renderTaskMarkdown(input.task_id, input.task_payload);
    const metadata = parseTaskMetadata({
      content,
      workspace_id: input.workspace_id,
      task_content_path: taskContentPath,
      submitted_task_id: input.task_id,
    });

    return {
      metadata,
      taskContentPath,
      resolvedTaskPath,
      materializedBy: 'server',
      contentToWrite: content
    };
  }

  if (!input.task_content_path) {
    throw new Error('submit_task requires task_payload. task_content_path is supported only for legacy planner-file submissions.');
  }

  const resolvedTaskPath = resolveWorkspaceTaskPath(workspaceRoot, input.task_content_path);
  if (!fs.existsSync(resolvedTaskPath)) {
    throw new Error(`Task file not found: ${input.task_content_path}`);
  }

  const content = fs.readFileSync(resolvedTaskPath, 'utf8');
  const metadata = parseTaskMetadata({
    content,
    workspace_id: input.workspace_id,
    task_content_path: input.task_content_path,
    submitted_task_id: input.task_id,
  });

  return {
    metadata,
    taskContentPath: input.task_content_path,
    resolvedTaskPath,
    materializedBy: 'planner-file'
  };
}

function resolveWorkspaceTaskPath(workspaceRoot: string, taskContentPath: string): string {
  if (path.isAbsolute(taskContentPath)) {
    throw new Error('task_content_path must be relative to the workspace root.');
  }

  const resolvedTaskPath = path.resolve(workspaceRoot, taskContentPath);
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);
  const isInsideWorkspace =
    resolvedTaskPath === normalizedWorkspaceRoot ||
    resolvedTaskPath.startsWith(`${normalizedWorkspaceRoot}${path.sep}`);
  if (!isInsideWorkspace) {
    throw new Error(`Task path escapes workspace root: ${taskContentPath}`);
  }

  const normalizedOrchestratorRoot = path.resolve(workspaceRoot, '.orchestrator');
  const isInsideOrchestrator =
    resolvedTaskPath === normalizedOrchestratorRoot ||
    resolvedTaskPath.startsWith(`${normalizedOrchestratorRoot}${path.sep}`);
  if (!isInsideOrchestrator) {
    throw new Error(`Task path must be under .orchestrator/: ${taskContentPath}`);
  }

  return resolvedTaskPath;
}

function renderTaskMarkdown(taskId: string, payload: TaskPayload): string {
  const action = requiredString(payload.action, 'task_payload.action');
  const body = requiredString(payload.body, 'task_payload.body');
  const priority = payload.priority ?? 0;
  if (!Number.isInteger(priority)) {
    throw new Error('task_payload.priority must be an integer.');
  }

  const lines = [
    '---',
    `task_id: ${formatYamlScalar(taskId)}`,
    `action: ${formatYamlScalar(action)}`,
    `priority: ${priority}`,
    `tool_bundle: ${formatYamlScalar(payload.tool_bundle || 'generic-file')}`,
  ];

  appendArray(lines, 'depends_on', normalizeStringArray(payload.depends_on, 'task_payload.depends_on'));
  appendArray(lines, 'target_files', normalizeStringArray(payload.target_files, 'task_payload.target_files'));
  appendArray(lines, 'read_files', normalizeStringArray(payload.read_files, 'task_payload.read_files'));
  appendArray(lines, 'skill_paths', normalizeStringArray(payload.skill_paths, 'task_payload.skill_paths'));
  appendArray(lines, 'context_paths', normalizeStringArray(payload.context_paths, 'task_payload.context_paths'));
  lines.push('---', '', body.trim(), '');

  return lines.join('\n');
}

function appendArray(lines: string[], key: string, values: string[]): void {
  if (values.length === 0) return;

  lines.push(`${key}:`);
  for (const value of values) {
    lines.push(`  - ${formatYamlScalar(value)}`);
  }
}

function normalizeStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }

  return value.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`${fieldName}[${index}] must be a non-empty string.`);
    }
    return item.trim();
  });
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function formatYamlScalar(value: string): string {
  if (/^[A-Za-z0-9._/@:+-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function safeTaskFileName(taskId: string): string {
  const safe = taskId.trim().replace(/[^A-Za-z0-9._-]/g, '-');
  if (!safe) {
    throw new Error('task_id must contain at least one filename-safe character.');
  }
  return safe;
}
