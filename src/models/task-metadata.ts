import { TASK_STATUS, type TaskStatusValue } from '../constants.js';
import type { TaskDef } from './task.js';

export interface TaskMetadata extends TaskDef {
  id: string;
  task_id: string;
  workspace_id: string;
  task_content_path: string;
  priority: number;
  status: TaskStatusValue;
  action: string;
  depends_on: string[];
  dependencies: string[];
  target_files: string[];
  read_files: string[];
  description: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  blocked_reason?: string;
}

interface ParsedFrontmatter {
  task_id?: string;
  action?: string;
  depends_on?: string[];
  target_files?: string[];
  read_files?: string[];
  priority?: number;
}

export interface ParseTaskMetadataInput {
  content: string;
  workspace_id: string;
  task_content_path: string;
  submitted_task_id: string;
  created_at?: string;
}

function parseScalar(rawValue: string): string | number {
  const trimmed = rawValue.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

function parseInlineArray(rawValue: string): string[] {
  const inner = rawValue.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map(item => item.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(frontmatter: string): ParsedFrontmatter {
  const result: ParsedFrontmatter = {};
  const lines = frontmatter.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      throw new Error(`Invalid frontmatter line: "${line}"`);
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value === '') {
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const listMatch = lines[j].match(/^\s*-\s*(.+)\s*$/);
        if (!listMatch) break;
        items.push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
        j++;
      }
      (result as Record<string, unknown>)[key] = items;
      i = j - 1;
      continue;
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      (result as Record<string, unknown>)[key] = parseInlineArray(value);
      continue;
    }

    (result as Record<string, unknown>)[key] = parseScalar(value);
  }

  return result;
}

export function parseTaskMetadata(input: ParseTaskMetadataInput): TaskMetadata {
  const match = input.content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Task file must start with YAML frontmatter wrapped in --- markers.');
  }

  const [, frontmatterBlock, body] = match;
  const frontmatter = parseFrontmatter(frontmatterBlock);

  const taskId = String(frontmatter.task_id || '').trim();
  if (!taskId) {
    throw new Error('Task frontmatter must include task_id.');
  }
  if (taskId !== input.submitted_task_id) {
    throw new Error(`Submitted task_id "${input.submitted_task_id}" does not match frontmatter task_id "${taskId}".`);
  }

  const action = String(frontmatter.action || '').trim();
  if (!action) {
    throw new Error('Task frontmatter must include action.');
  }

  const priority = typeof frontmatter.priority === 'number' ? frontmatter.priority : 0;
  const dependsOn = Array.isArray(frontmatter.depends_on) ? frontmatter.depends_on : [];
  const targetFiles = Array.isArray(frontmatter.target_files) ? frontmatter.target_files : [];
  const readFiles = Array.isArray(frontmatter.read_files) ? frontmatter.read_files : [];

  return {
    id: taskId,
    task_id: taskId,
    module: action,
    action,
    verification: '',
    workspace_id: input.workspace_id,
    task_content_path: input.task_content_path,
    priority,
    status: TASK_STATUS.PENDING,
    depends_on: dependsOn,
    dependencies: dependsOn,
    target_files: targetFiles,
    read_files: readFiles,
    description: body.trim(),
    created_at: input.created_at || new Date().toISOString(),
  };
}
