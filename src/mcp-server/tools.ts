import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {
  TOOL_NAMES, STATE_EVENTS, TASK_STATUS, AGENT_ACTION,
  WORKER_STATUS, FILE_PREFIXES, VERSION, DIR_NAMES
} from '../constants.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ServerContext, TaskDef, TaskGraph, TaskResult } from '../models/index.js';
import { executeScanWorkspace } from './tools/scan-workspace.js';
import { executeSessionCheckpoint } from './tools/session-checkpoint.js';
import type { SessionCheckpointInput } from './tools/session-checkpoint.js';
import { connectWorkspace } from '../server-tools/workspace-connector.js';
import { submitWorkspaceTask } from '../server-tools/task-submitter.js';
import { WorkspaceRegistry } from '../utils/workspace-registry.js';
import { bootstrapWorkspace } from '../utils/bootstrap.js';
import { ensureDir, writeJSON } from '../utils/file-backend.js';
import { assertActiveWorkspace, getWorkerCurrentTaskId } from '../utils/identity-invariants.js';

const STRIP_FIELDS = ['status', 'assigned_to', 'priority', 'metadata', 'dependencies', 'done_criteria'];

type ToolResponse = CallToolResult;
type ToolHandler<TParams extends Record<string, any> = Record<string, any>> = (params: TParams) => Promise<ToolResponse>;

const TaskPayloadSchema = z.object({
  action: z.string().min(1).describe('Task action/module for the worker.'),
  body: z.string().min(1).describe('Markdown task body. The server materializes this into the workspace task file.'),
  priority: z.number().int().optional().describe('Lower number dispatches earlier.'),
  tool_bundle: z.string().optional().describe('Tool bundle name for the Harness. Defaults to generic-file.'),
  depends_on: z.array(z.string()).optional().describe('Task IDs this task depends on.'),
  target_files: z.array(z.string()).optional().describe('Files the worker may edit.'),
  read_files: z.array(z.string()).optional().describe('Files the worker should inspect.'),
  skill_paths: z.array(z.string()).optional().describe('Workspace-local skill paths under .orchestrator/skills/.'),
  context_paths: z.array(z.string()).optional().describe('Workspace-local context paths under .orchestrator/context/.'),
});

function compactTask(task: TaskDef | null): Partial<TaskDef> | null {
  if (!task) return task;
  const clone = { ...task };
  for (const field of STRIP_FIELDS) {
    delete clone[field];
  }
  return clone;
}

function formatError(err: any): ToolResponse {
  return {
    content: [{ type: "text", text: `Error: ${err.message}` }],
    isError: true
  };
}

/**
 * Middleware: auto-update heartbeat cho mọi tool call có worker_id.
 * Agent không cần gọi report_progress chỉ để keepalive.
 * Uses workerRegistry from context (DI).
 */
function withHeartbeat<TParams extends Record<string, any>>(
  handler: ToolHandler<TParams>,
  context: ServerContext
): ToolHandler<TParams> {
  return async (params: TParams) => {
    if (params.worker_id) {
      context.workerRegistry.updateHeartbeat(params.worker_id);
    }
    return handler(params);
  };
}

export function registerTools(server: McpServer, context: ServerContext): void {
  const { stateManager, workerRegistry, logger } = context;

  function findGroupForTask(taskId: string): string | number | null {
    for (const group of stateManager.queue.groups) {
      if (group.tasks.includes(taskId)) return group.group_id;
    }
    return null;
  }

  server.registerTool(
    TOOL_NAMES.HELLO_WORLD,
    {
      description: "A simple hello world tool",
      inputSchema: { name: z.string().describe("Your name") }
    },
    async ({ name }) => {
      try {
        return {
          content: [{ type: "text", text: `Hello, ${name}! MCP Orchestrator is running.` }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.REGISTER_WORKSPACE,
    {
      description: "Connect/register the configured workspace and bootstrap its .orchestrator runtime structure.",
      inputSchema: {
        workspace_path: z.string().min(1, "workspace_path must not be empty")
          .describe("Absolute path to the target workspace. Must match the workspace this server was started with.")
      }
    },
    async ({ workspace_path }) => {
      try {
        const workspace = connectWorkspace({
          workspacePath: workspace_path,
          runtimeRoot: context.config.runtimeRoot,
          configuredWorkspaceId: context.config.workspace.workspaceId
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ...workspace,
              server_root: context.config.root,
              contract_mode: "workspace-first"
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  // Canonical contract is assignment-first: the orchestrator assigns work,
  // and workers only acknowledge, report progress, and complete owned tasks.
  server.registerTool(
    TOOL_NAMES.REGISTER_WORKER,
    {
      description: "Register a new worker and get a unique UUID. Orchestrator assigns role separately. workspace_path is required — no implicit workspace discovery.",
      inputSchema: {
        workspace_path: z.string().min(1, "workspace_path must not be empty")
          .describe("Absolute path to the target project workspace. Required — no implicit workspace discovery.")
      }
    },
    async ({ workspace_path }) => {
      try {
        const status = stateManager.getStatus();
        const workspace = connectWorkspace({
          workspacePath: workspace_path,
          runtimeRoot: context.config.runtimeRoot,
          configuredWorkspaceId: context.config.workspace.workspaceId
        });
        const worker = workerRegistry.register(workspace.workspace_id);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              worker_id: worker.id,
              server_root: context.config.root,
              workspace_root: workspace.workspace_root,
              workspace_id: workspace.workspace_id,
              queue_summary: status,
              contract_mode: "assignment-first"
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.GET_STATUS,
    {
      description: "Get server status and version",
    },
    async () => {
      try {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              server: "orchestrator",
              version: VERSION,
              uptime: process.uptime(),
              transport: "streamable-http",
              connected_workers: workerRegistry.getActiveWorkerCount()
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.SUBMIT_TASK,
    {
      description: "Submit a planner task payload. The server materializes the task file and registers it for assignment-first dispatch.",
      inputSchema: {
        task_id: z.string().min(1).describe("Task ID declared by the planner."),
        workspace_id: z.string().min(1).describe("Workspace ID that owns the task."),
        task_payload: TaskPayloadSchema.optional().describe("Canonical task payload. Preferred over task_content_path."),
        task_content_path: z.string().min(1).optional().describe("Legacy path to an existing markdown task file, relative to the workspace root.")
      }
    },
    async ({ task_id, workspace_id, task_payload, task_content_path }) => {
      try {
        const result = submitWorkspaceTask(context, {
          task_id,
          workspace_id,
          task_payload,
          task_content_path,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.COMPLETE_TASK,
    {
      description: "Complete a currently assigned task",
      inputSchema: { 
        task_id: z.string().describe("Task ID"),
        status: z.enum([TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.FAILED]).describe("Completion status"),
        summary: z.string().describe("Short summary of what was done"),
        worker_id: z.string().describe("Your worker UUID")
      }
    },
    withHeartbeat(async ({ task_id, status, summary, worker_id }) => {
      try {
        const worker = workerRegistry.getWorker(worker_id);
        if (!worker) throw new Error("Invalid worker_id");

        // Handle disconnected worker that comes back with a late result
        if (worker.status === WORKER_STATUS.DISCONNECTED) {
          // Re-activate the worker
          worker.status = WORKER_STATUS.IDLE;
          delete worker.disconnected_at;

          if (logger) {
            logger.log('WORKER_RECONNECTED', {
              worker_id,
              task_id,
              message: `Disconnected worker ${worker_id} came back with result for task ${task_id}`
            });
          }

          // Task may have been requeued by recovery — check if it's still valid
          if (!stateManager.isTaskInActive(task_id)) {
            if (logger) {
              logger.log('LATE_RESULT_DISCARDED', {
                worker_id,
                task_id,
                message: `Late result from reconnected worker discarded — task ${task_id} no longer in active/`
              });
            }
            workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
            return {
              content: [{ type: "text", text: JSON.stringify({
                accepted: false,
                reason: 'late_result',
                task_id,
                message: `Task ${task_id} was already requeued/completed. Your result was discarded.`,
                next_action: { action: AGENT_ACTION.IDLE }
              }) }]
            };
          }

          // Task still in active — this worker's result is valid, re-assign ownership
          workerRegistry.assignTask(worker_id, task_id, stateManager.taskRegistry);
        }

        if (getWorkerCurrentTaskId(worker) !== task_id) {
          throw new Error("Worker does not own this task");
        }

        const result: TaskResult & Record<string, unknown> = { task_id, status, summary, worker_id, completed_at: new Date().toISOString() };

        // ─── DONE: move to outbox normally ───
        if (status === TASK_STATUS.DONE) {
          stateManager.moveToOutbox(task_id, result);
          workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
          worker.tasks_completed++;
          
          if (logger) logger.log(STATE_EVENTS.TASK_COMPLETED, { task_id, status, worker_id });
          stateManager.saveCheckpoint();

          // Sync result to workspace
          try {
            const wsRoot = context.config.workspace.workspaceRoot;
            if (wsRoot) {
              const wsResultDir = context.config.workspace.results.base;
              ensureDir(wsResultDir);
              const wsResultPath = path.join(wsResultDir, `result-${task_id}.json`);
              const syncResult = {
                task_id: result.task_id,
                status: result.status,
                summary: result.summary,
                completed_at: result.completed_at
              };
              writeJSON(wsResultPath, syncResult);
            }
          } catch (err: any) {
            if (logger) logger.log('WORKSPACE_SYNC_FAILED', { task_id, error: err.message });
          }
          
          return {
            content: [{ type: "text", text: JSON.stringify({
              accepted: true,
              completed: task_id,
              next_action: { action: AGENT_ACTION.IDLE }
            }) }]
          };
        }

        // ─── FAILED / BLOCKED: requeue to inbox for retry ───
        const retryCount = stateManager.getTaskRetryCount(task_id);
        const maxTaskRetries = context.config.global.recovery.maxTaskRetries;

        if (retryCount >= maxTaskRetries) {
          // Permanently failed → outbox (won't be auto-recovered)
          result.permanently_failed = true;
          result.retry_count = retryCount;
          stateManager.moveToOutbox(task_id, result);
          workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
          
          if (logger) {
            logger.log(STATE_EVENTS.TASK_PERMANENTLY_FAILED, {
              task_id, status, worker_id, retry_count: retryCount, max_retries: maxTaskRetries,
              message: `Task ${task_id} permanently failed after ${retryCount} attempts. Dependent tasks will be blocked.`
            });
          }
          
          stateManager.saveCheckpoint();
          
          return { content: [{ type: "text", text: JSON.stringify({
            accepted: true,
            permanently_failed: task_id,
            retry_count: retryCount,
            message: `Task permanently failed after ${retryCount} attempts. Dependent tasks blocked until manual intervention.`,
            next_action: { action: AGENT_ACTION.IDLE }
          }) }] };
        }

        const workspaceRoot = context.config.workspace.workspaceRoot;
        const newRetryCount = stateManager.requeueWithRetry(task_id, workspaceRoot);
        workerRegistry.clearAssignment(worker_id, stateManager.taskRegistry);
        
        if (logger) {
          logger.log(STATE_EVENTS.TASK_REQUEUED, { task_id, status, worker_id, retry_count: newRetryCount });
        }
        
        stateManager.saveCheckpoint();
        
        return {
          content: [{ type: "text", text: JSON.stringify({
            accepted: true,
            requeued: task_id,
            retry_count: newRetryCount,
            next_action: { action: AGENT_ACTION.IDLE }
          }) }]
        };
      } catch (err) {
        return formatError(err);
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.REPORT_PROGRESS,
    {
      description: "Report progress on a currently assigned task",
      inputSchema: {
        task_id: z.string().describe("Task ID"),
        step: z.string().describe("Current step description"),
        percentage: z.number().min(0).max(100).describe("Progress percentage"),
        worker_id: z.string().describe("Your worker UUID")
      }
    },
    withHeartbeat(async ({ task_id, step, percentage, worker_id }) => {
      try {
        const worker = workerRegistry.getWorker(worker_id);
        if (!worker) throw new Error("Invalid worker_id");
        if (getWorkerCurrentTaskId(worker) !== task_id) {
          throw new Error("Worker does not own this task");
        }
        
        if (logger) {
            logger.log(STATE_EVENTS.PROGRESS, { task_id, step, percentage, worker_id });
        }
        
        return {
          content: [{ type: "text", text: "ok" }]
        };
      } catch (err) {
         return formatError(err);
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.GET_QUEUE_STATUS,
    {
      description: "Get the current queue counts and overall status",
    },
    async () => {
      try {
        const status = {
          ...stateManager.getStatus(),
          workers: workerRegistry.getActiveWorkerCount()
        };
        return {
          content: [{ type: "text", text: JSON.stringify(status) }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.GET_CHECKPOINT,
    {
      description: "Get the latest queue checkpoint path",
    },
    async () => {
      try {
        const checkpointPath = stateManager.saveCheckpoint();
        return {
          content: [{ type: "text", text: JSON.stringify({ checkpoint_file_path: checkpointPath }) }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  const TaskDefSchema = z.object({
    id: z.string().regex(/^\d{2}-[a-z0-9-]+$/, "id must be in XX-kebab-case format"),
    module: z.string(),
    action: z.string(),
    verification: z.string()
  }).passthrough();

  server.registerTool(
    TOOL_NAMES.SUBMIT_DECOMPOSITION,
    {
      description: "Submit decomposed tasks and graph dependency. Marks source plan as done.",
      inputSchema: {
        tasks: z.array(TaskDefSchema).max(20).describe("List of tasks"),
        graph: z.object({
            groups: z.array(z.object({
                group_id: z.number(),
                tasks: z.array(z.string()),
                depends_on: z.array(z.number()).optional()
            }))
        }).describe("DAG constraint groups"),
        reasoning: z.string().describe("Justification for the breakdown"),
        source_plan: z.string().describe("Filename of the plan being decomposed (from check_plans)"),
        worker_id: z.string().optional().describe("Planner worker UUID")
      }
    },
    withHeartbeat(async ({ tasks, graph, reasoning, source_plan, worker_id }) => {
      try {
         // Auto-prefix task IDs with Plan name to prevent collision across multiple plans
         const registry = new WorkspaceRegistry(context.config.runtimeRoot);
         assertActiveWorkspace(
           registry.getById(context.config.workspace.workspaceId),
           context.config.workspace.workspaceId
         );

         const planPrefix = source_plan.replace(/\.md$/, '') + '-';
         const mutableTasks = tasks as TaskDef[];
         const mutableGraph = graph as unknown as TaskGraph;

         for (const task of mutableTasks) {
           task.id = planPrefix + task.id;
         }
         if (mutableGraph && mutableGraph.groups) {
           for (const group of mutableGraph.groups) {
             group.group_id = planPrefix + group.group_id;
             if (group.depends_on) {
               group.depends_on = group.depends_on.map(id => planPrefix + id);
             }
             if (group.tasks) {
               group.tasks = group.tasks.map(id => planPrefix + id);
             }
           }
         }

         // Throws if circular deps
         stateManager.storeTasks(mutableTasks, mutableGraph);
         stateManager.completePlan(source_plan);
         
         return {
           content: [{ type: "text", text: JSON.stringify({
             accepted: true,
             plan_completed: source_plan,
             tasks_created: mutableTasks.length
           }) }]
         };
      } catch (err: any) {
         return {
          content: [{ type: "text", text: JSON.stringify({ accepted: false, errors: [err.message] }) }]
        };
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.REQUEST_RETRY,
    {
      description: "Request to requeue a failed or outbox task",
      inputSchema: {
         task_id: z.string(),
         reason: z.string(),
         attempt: z.number()
      }
    },
    withHeartbeat(async ({ task_id, reason, attempt }) => {
      try {
        const maxRetries = context.config.global.recovery.maxTaskRetries;
        if (attempt > maxRetries) throw new Error(`Max retry attempt exceeded (max: ${maxRetries})`);

        // Use requeueWithRetry to properly track retry count on disk
        const newRetryCount = stateManager.requeueWithRetry(task_id);
        
        return {
           content: [{ type: "text", text: JSON.stringify({
             approved: true,
             file_path: `inbox/task-${task_id}.json`,
             retry_count: newRetryCount
           }) }]
        };
      } catch(err) {
         return formatError(err);
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.FORCE_RELEASE_TASK,
    {
      description: "Forcefully release a locked task from active/ back to inbox/. Use when worker crashed and task is stuck. Does NOT increment retry count (manual intervention, not a failure).",
      inputSchema: {
        task_id: z.string().describe("Task ID to release"),
        reason: z.string().describe("Why you are forcing release")
      }
    },
    async ({ task_id, reason }) => {
      try {
        // Check task exists in active/
        const activePath = path.join(
          context.config.workspace.exchange.active, 
          `${FILE_PREFIXES.TASK}${task_id}.json`
        );
        
        if (!fs.existsSync(activePath)) {
          throw new Error(`Task ${task_id} not found in active/ directory`);
        }
        
        // Force move back to inbox (no retry increment — manual intervention)
        stateManager.moveToInbox(task_id);
        
        // Clear worker assignment if any worker owns this task
        for (const worker of workerRegistry.getAllWorkers()) {
          if (getWorkerCurrentTaskId(worker) === task_id) {
            workerRegistry.clearAssignment(worker.id, stateManager.taskRegistry);
            break;
          }
        }
        
        if (logger) {
          logger.log('TASK_FORCE_RELEASED', { task_id, reason });
        }
        
        stateManager.saveCheckpoint();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              released: true,
              task_id,
              moved_to: "inbox",
              reason,
              note: "Retry count NOT incremented (manual intervention)"
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.GET_TEMPLATE,
    {
      description: "Get a standardized template by name from the orchestrator",
      inputSchema: { template_name: z.string().describe("Name of the template file (e.g. knowledge.md)") }
    },
    async ({ template_name }) => {
      try {
        // Prevent path traversal by extracting just the base name
        const normalizedName = path.basename(template_name);
        let templatePath = path.join(context.config.root, DIR_NAMES.TEMPLATES, normalizedName);

        // Auto-resolve if extension was omitted
        if (!fs.existsSync(templatePath)) {
          if (fs.existsSync(`${templatePath}.md`)) {
            templatePath = `${templatePath}.md`;
          } else if (fs.existsSync(`${templatePath}.template.json`)) {
            templatePath = `${templatePath}.template.json`;
          } else if (fs.existsSync(`${templatePath}.json`)) {
            templatePath = `${templatePath}.json`;
          }
        }

        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template not found: ${normalizedName}`);
        }
        
        const content = fs.readFileSync(templatePath, 'utf8');
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.PING,
    {
      description: "Ping the orchestrator to keep the worker session alive",
      inputSchema: { worker_id: z.string().describe("Your worker UUID") }
    },
    withHeartbeat(async ({ worker_id }) => {
      try {
        return {
          content: [{ type: "text", text: JSON.stringify({ status: "alive" }) }]
        };
      } catch (err) {
        return formatError(err);
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.SCAN_WORKSPACE,
    {
      description: "Scan the workspace and generate .agent/workspace-memory.md with file map, dependency graph, and git co-change analysis. Returns cached result if file already exists unless force_update is true.",
      inputSchema: {
        force_update: z.boolean().default(false)
          .describe("Force re-scan even if workspace-memory.md already exists")
      }
    },
    async ({ force_update }) => {
      try {
        const scanRoot = context.config.root;
        const result = executeScanWorkspace(scanRoot, force_update);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  server.registerTool(
    TOOL_NAMES.SESSION_CHECKPOINT,
    {
      description: "Save, load, or clear session state for agent resume. Supports UnifiedCheckpoint shared schema.",
      inputSchema: {
        action: z.enum(['save', 'load', 'clear']).describe("Action to perform"),
        task_id: z.string().optional().describe("Task ID"),
        phase: z.enum(['pre-flight', 'implementation', 'verification', 'done']).optional()
          .describe("Current phase of the task"),
        files_changed: z.array(z.string()).optional()
          .describe("Files created or modified this session"),
        completed_steps: z.array(z.string()).optional()
          .describe("Checklist steps completed"),
        remaining_steps: z.array(z.string()).optional()
          .describe("Checklist steps left"),
        error_context: z.object({
          error: z.string(),
          hypothesis: z.string(),
          attempted_fix: z.string(),
          retry_count: z.number().optional()
        }).nullable().optional()
          .describe("Error diagnosis from a failed attempt (null if no error)"),
        token_usage: z.object({
          used: z.number(),
          limit: z.number()
        }).optional()
          .describe("Token usage statistics"),
        // Legacy v1/v2 fields (backward compat)
        done_criteria_status: z.record(z.string(), z.boolean()).optional(),
        last_action: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      }
    },
    async (input) => {
      try {
        const workspaceRoot = context.config.workspace.workspaceRoot;
        const result = executeSessionCheckpoint(workspaceRoot, input as SessionCheckpointInput);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  // ── close_workspace ─────────────────────────────────────
  server.registerTool(
    TOOL_NAMES.CLOSE_WORKSPACE,
    {
      description: "Close/detach a workspace from the server. Stops accepting new plans and task assignments. Runtime state is preserved on disk. Rejects if active tasks exist in the workspace.",
      inputSchema: {
        workspace_id: z.string().min(1, "workspace_id is required")
          .describe("The workspace ID to close (8-char hex from registration).")
      }
    },
    async ({ workspace_id }) => {
      try {
        const registry = new WorkspaceRegistry(context.config.runtimeRoot);
        const ws = registry.getById(workspace_id);

        if (!ws) {
          return formatError(new Error(`Workspace "${workspace_id}" not found in registry.`));
        }

        if (ws.status === 'closed') {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                workspace_id,
                status: 'closed',
                message: 'Workspace is already closed.',
                closed_at: ws.closed_at
              })
            }]
          };
        }

        // Hard reject: check for active tasks in this workspace
        const sm = stateManager as any;
        const activeTasks = typeof sm.getActiveTasksForWorkspace === 'function'
          ? sm.getActiveTasksForWorkspace(workspace_id)
          : [];
        if (activeTasks.length > 0) {
          return formatError(new Error(
            `Cannot close workspace "${workspace_id}": ${activeTasks.length} active task(s) remain. ` +
            `Complete or release them first.`
          ));
        }

        const closed = registry.close(workspace_id);
        if (!closed) {
          return formatError(new Error(`Failed to close workspace "${workspace_id}".`));
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              workspace_id: closed.id,
              name: closed.name,
              status: closed.status,
              closed_at: closed.closed_at,
              runtime_state: 'preserved',
              message: 'Workspace closed. No new plans or tasks will be accepted. Runtime state preserved on disk.'
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

  // ── reopen_workspace ────────────────────────────────────
  server.registerTool(
    TOOL_NAMES.REOPEN_WORKSPACE,
    {
      description: "Explicitly reopen a previously closed workspace. Validates that the original path still exists. Reuses the same workspace_id. Runtime state (plans, queue, checkpoints, memory) is resumed.",
      inputSchema: {
        workspace_id: z.string().min(1, "workspace_id is required")
          .describe("The workspace ID to reopen (8-char hex from registration).")
      }
    },
    async ({ workspace_id }) => {
      try {
        const registry = new WorkspaceRegistry(context.config.runtimeRoot);
        const reopened = registry.reopen(workspace_id);

        // Ensure runtime directories exist
        bootstrapWorkspace(reopened.path, reopened);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              workspace_id: reopened.id,
              name: reopened.name,
              path: reopened.path,
              status: reopened.status,
              runtime_state: 'resumed',
              message: 'Workspace reopened. Existing runtime state (plans, queue, checkpoints, memory) is now active.'
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
  );

}
