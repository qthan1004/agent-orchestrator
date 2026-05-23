import fs from 'fs';
import path from 'path';
import type { ServerContext } from '../mcp-server/context.js';
import type { PlannerWorkflowPaths } from '../models/index.js';
import { atomicWrite, ensureDir } from '../utils/file-backend.js';

const WORKFLOW_FILES = {
  preflight: 'preflight.md',
  create_plan: path.join('workflows', 'create-plan.md'),
  create_tasks: path.join('workflows', 'create-tasks.md'),
} as const;

export interface PlannerWorkflowBootstrap {
  paths: PlannerWorkflowPaths;
  preflight: string;
}

export interface CreatePlanInput {
  planner_id: string;
  title: string;
  conversation_summary: string;
  analysis: string;
  plan_markdown: string;
}

export interface CreatePlanResult {
  status: 'pending_user_approval';
  plan_file: string;
  plan_path: string;
  approval_required: true;
}

function toWorkspaceRelative(workspaceRoot: string, filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
}

function workflowSourcePath(context: ServerContext, relativePath: string): string {
  return path.join(context.config.root, 'reference', 'planner-workflows', relativePath);
}

function workflowDestPath(context: ServerContext, relativePath: string): string {
  return path.join(context.config.workspace.workspaceRoot, '.orchestrator', 'planner', relativePath);
}

function copyWorkflowFile(context: ServerContext, relativePath: string): string {
  const source = workflowSourcePath(context, relativePath);
  const dest = workflowDestPath(context, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Planner workflow source missing: ${source}`);
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(source, dest);
  return dest;
}

export function syncPlannerWorkflows(context: ServerContext): PlannerWorkflowBootstrap {
  const preflightPath = copyWorkflowFile(context, WORKFLOW_FILES.preflight);
  const createPlanPath = copyWorkflowFile(context, WORKFLOW_FILES.create_plan);
  const createTasksPath = copyWorkflowFile(context, WORKFLOW_FILES.create_tasks);

  return {
    paths: {
      preflight: toWorkspaceRelative(context.config.workspace.workspaceRoot, preflightPath),
      create_plan: toWorkspaceRelative(context.config.workspace.workspaceRoot, createPlanPath),
      create_tasks: toWorkspaceRelative(context.config.workspace.workspaceRoot, createTasksPath),
    },
    preflight: fs.readFileSync(preflightPath, 'utf8'),
  };
}

function safePlanSlug(title: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
  return safe || 'plan';
}

function renderPlanMarkdown(input: CreatePlanInput): string {
  return [
    '---',
    `created_by: planner`,
    `planner_id: ${JSON.stringify(input.planner_id)}`,
    `approval_status: pending_user_approval`,
    '---',
    '',
    `# ${input.title.trim()}`,
    '',
    '## Conversation Summary',
    '',
    input.conversation_summary.trim(),
    '',
    '## Planner Analysis',
    '',
    input.analysis.trim(),
    '',
    '## Proposed Plan',
    '',
    input.plan_markdown.trim(),
    '',
    '## Approval',
    '',
    'Status: pending user approval.',
    '',
    'If rejected, the user and planner may edit this file directly. The server does not modify rejected plan content.',
    '',
  ].join('\n');
}

export function createPlannerPlan(context: ServerContext, input: CreatePlanInput): CreatePlanResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${safePlanSlug(input.title)}.md`;
  const planPath = path.join(context.config.workspace.plans.pending, filename);
  const content = renderPlanMarkdown(input);
  if (!atomicWrite(planPath, content)) {
    throw new Error(`Failed to write plan file: ${filename}`);
  }

  return {
    status: 'pending_user_approval',
    plan_file: filename,
    plan_path: toWorkspaceRelative(context.config.workspace.workspaceRoot, planPath),
    approval_required: true,
  };
}
