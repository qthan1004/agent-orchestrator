import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {
  TOOL_NAMES, STATE_EVENTS, TASK_STATUS, AGENT_ACTION, WORKER_ROLE,
  WORKER_STATUS, FILE_PREFIXES, VERSION, DIR_NAMES
} from '../constants.mjs';
import { waitForTask, waitForPlan } from './poll-helpers.mjs';
import { resolveIdleAction } from './idle-resolver.mjs';

const STRIP_FIELDS = ['status', 'assigned_to', 'priority', 'metadata', 'dependencies', 'done_criteria'];

function compactTask(task) {
  if (!task) return task;
  const clone = { ...task };
  for (const field of STRIP_FIELDS) {
    delete clone[field];
  }
  return clone;
}

function formatError(err) {
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
function withHeartbeat(handler, context) {
  return async (params) => {
    if (params.worker_id) {
      context.workerRegistry.updateHeartbeat(params.worker_id);
    }
    return handler(params);
  };
}

export function registerTools(server, context) {
  const { stateManager, workerRegistry, logger } = context;

  function findGroupForTask(taskId) {
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
    TOOL_NAMES.REGISTER_WORKER,
    {
      description: "Register a new worker and get a unique UUID",
      inputSchema: {
        workspace_path: z.string().optional()
          .describe("Absolute path to the target project workspace. Overrides server config.")
      }
    },
    async ({ workspace_path } = {}) => {
      try {
        const worker = workerRegistry.register();
        const status = stateManager.getStatus();
        const planStatus = stateManager.checkPlansQuick();
        const { plannerAliveThresholdMs } = context.config.recovery;
        
        // Determine role — SINGLE PLANNER enforced
        let role = WORKER_ROLE.WORKER;
        
        if (status.pending === 0 && status.active === 0) {
          // No tasks in queue
          if (planStatus.hasPending || planStatus.hasProcessing) {
            // Plans available → need planner?
            const activePlanner = workerRegistry.getActivePlanner(plannerAliveThresholdMs);
            if (!activePlanner) {
              role = WORKER_ROLE.PLANNER;
            } else {
              role = WORKER_ROLE.IDLE; // planner exists, no tasks
            }
          } else {
            role = WORKER_ROLE.IDLE; // nothing to do
          }
        }
        // else: tasks available → WORKER (default)
        
        workerRegistry.setRole(worker.id, role);
        
        // Priority: agent param > server config > null
        const resolvedWorkspace = workspace_path || context.config.workspaceRoot || null;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              worker_id: worker.id,
              role: role,
              server_root: context.config.root,
              workspace_root: resolvedWorkspace,
              queue_summary: status,
              has_pending_plans: planStatus.hasPending || planStatus.hasProcessing
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
    TOOL_NAMES.GET_NEXT_TASK,
    {
      description: "Get the next pending task for the worker to execute",
      inputSchema: { worker_id: z.string().describe("Your worker UUID from register_worker") }
    },
    withHeartbeat(async ({ worker_id }) => {
      try {
        const worker = workerRegistry.getWorker(worker_id);
        if (!worker) throw new Error("Invalid worker_id");
        
        // Long poll
        const { pollTimeoutMs, checkIntervalMs } = context.config.polling;
        const task = await waitForTask(stateManager.queue, { 
          timeoutMs: pollTimeoutMs, 
          checkIntervalMs 
        });
        
        if (!task) {
          // No task → check if should become planner
          const idleResult = resolveIdleAction({ stateManager, workerRegistry, workerId: worker_id, config: context.config });
          // Backward compatibility via task_id: null
          return {
            content: [{ type: "text", text: JSON.stringify({ ...idleResult, task_id: null }) }]
          };
        }
        
        // Có task → assign
        stateManager.moveToActive(task.id);
        worker.current_task = task.id;
        workerRegistry.setRole(worker_id, WORKER_ROLE.WORKER);
        
        if (logger) logger.log(STATE_EVENTS.TASK_ASSIGNED, { task_id: task.id, worker_id });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: AGENT_ACTION.EXECUTE,
              task_id: task.id,
              task_details: compactTask(task),
              context: {
                group_id: findGroupForTask(task.id),
                total_remaining: stateManager.queue.getStatus().pending
              }
            })
          }]
        };
      } catch (err) {
        return formatError(err);
      }
    }, context)
  );

  server.registerTool(
    TOOL_NAMES.COMPLETE_TASK,
    {
      description: "Complete a currently assigned task",
      inputSchema: { 
        task_id: z.string().describe("Task ID"),
        status: z.enum([TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.FAILED]).describe("Completion status"),
        summary: z.string().describe("Short summary of what was done"),
        worker_id: z.string().describe("Your worker UUID"),
        auto_pickup: z.boolean().optional().default(true).describe("Auto-pickup next task")
      }
    },
    withHeartbeat(async ({ task_id, status, summary, worker_id, auto_pickup = true }) => {
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
            // Task was already requeued or completed by another worker
            if (logger) {
              logger.log('LATE_RESULT_DISCARDED', {
                worker_id,
                task_id,
                message: `Late result from reconnected worker discarded — task ${task_id} no longer in active/`
              });
            }
            worker.current_task = null;
            return {
              content: [{ type: "text", text: JSON.stringify({
                accepted: false,
                reason: 'late_result',
                task_id,
                message: `Task ${task_id} was already requeued/completed. Your result was discarded.`,
                next_task: { action: AGENT_ACTION.IDLE }
              }) }]
            };
          }

          // Task still in active — this worker's result is valid, re-assign ownership
          worker.current_task = task_id;
        }

        if (worker.current_task !== task_id) {
          throw new Error("Worker does not own this task");
        }

        const result = { task_id, status, summary, worker_id, completed_at: new Date().toISOString() };

        // ─── Helper: try auto-pickup next task ───
        const tryAutoPickup = (responseBase) => {
          if (!auto_pickup) {
            return { content: [{ type: "text", text: JSON.stringify({
              ...responseBase,
              next_task: { action: AGENT_ACTION.IDLE }
            }) }] };
          }

          const nextTask = stateManager.queue.getNextTask();
          if (nextTask) {
            stateManager.moveToActive(nextTask.id);
            worker.current_task = nextTask.id;
            return { content: [{ type: "text", text: JSON.stringify({
              ...responseBase,
              next_task: {
                action: AGENT_ACTION.EXECUTE,
                task_id: nextTask.id,
                task_details: compactTask(nextTask),
                context: {
                  group_id: findGroupForTask(nextTask.id),
                  total_remaining: stateManager.queue.getStatus().pending
                }
              }
            }) }] };
          }

          // No more tasks → check planner re-election
          const idleResult = resolveIdleAction({ 
            stateManager, workerRegistry, workerId: worker_id, config: context.config 
          });
          return { content: [{ type: "text", text: JSON.stringify({
            ...responseBase,
            next_task: idleResult
          }) }] };
        };

        // ─── DONE: move to outbox normally ───
        if (status === TASK_STATUS.DONE) {
          stateManager.moveToOutbox(task_id, result);
          worker.current_task = null;
          worker.tasks_completed++;
          
          if (logger) logger.log(STATE_EVENTS.TASK_COMPLETED, { task_id, status, worker_id });
          stateManager.saveCheckpoint();
          
          return tryAutoPickup({ accepted: true, completed: task_id });
        }

        // ─── FAILED / BLOCKED: requeue to inbox for retry ───
        const retryCount = stateManager.getTaskRetryCount(task_id);
        const maxTaskRetries = context.config.recovery.maxTaskRetries;

        if (retryCount >= maxTaskRetries) {
          // Permanently failed → outbox (won't be auto-recovered)
          result.permanently_failed = true;
          result.retry_count = retryCount;
          stateManager.moveToOutbox(task_id, result);
          worker.current_task = null;
          // Don't increment tasks_completed for permanent failures
          
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
            next_task: { action: AGENT_ACTION.IDLE }
          }) }] };
        }

        // Under retry limit → requeue to inbox
        const newRetryCount = stateManager.requeueWithRetry(task_id);
        worker.current_task = null;
        // Don't increment tasks_completed for failed/blocked tasks
        
        if (logger) {
          logger.log(STATE_EVENTS.TASK_REQUEUED, { task_id, status, worker_id, retry_count: newRetryCount });
        }
        
        stateManager.saveCheckpoint();
        
        return tryAutoPickup({ accepted: true, requeued: task_id, retry_count: newRetryCount });
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
        const status = stateManager.getStatus();
        status.workers = workerRegistry.getActiveWorkerCount();
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

  server.registerTool(
    TOOL_NAMES.CHECK_PLANS,
    {
      description: "Check for new plan files in plan/pending/. Returns 'ready' with plan path if found (auto-moves to processing/), 'busy' if already processing one, 'idle' if none pending.",
    },
    async () => {
      try {
        const { planPollTimeoutMs, checkIntervalMs } = context.config.polling;
        const result = await waitForPlan(stateManager, {
          timeoutMs: planPollTimeoutMs,
          checkIntervalMs: checkIntervalMs * 2  // plan check ít thường xuyên hơn
        });
        
        if (result.status === 'idle') {
          return { content: [{ type: "text", text: JSON.stringify({ action: AGENT_ACTION.IDLE }) }] };
        }
        
        if (result.status === 'busy') {
          // A plan is already in processing/. This could be because PlanWatcher auto-moved it, 
          // or a previous planner crashed. We should give it to the current planner to decompose.
          return { content: [{ type: "text", text: JSON.stringify({ 
            action: AGENT_ACTION.DECOMPOSE, 
            plan_path: result.plan_path,
            content: result.content,
            pending_count: result.pending_count
          }) }] };
        }
        
        // ready
        return { content: [{ type: "text", text: JSON.stringify({
          action: AGENT_ACTION.DECOMPOSE,
          plan_path: result.plan_path,
          content: result.content,
          pending_count: result.pending_count
        }) }] };
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
        worker_id: z.string().optional().describe("Planner worker UUID for role transition")
      }
    },
    withHeartbeat(async ({ tasks, graph, reasoning, source_plan, worker_id }) => {
      try {
         // Throws if circular deps
         stateManager.storeTasks(tasks, graph);
         stateManager.completePlan(source_plan);
         
         const planStatus = stateManager.checkPlansQuick();
         let nextAction;
         
         if (planStatus.hasPending) {
           const nextPlan = stateManager.checkPlans(); // move pending → processing
           nextAction = {
             action: AGENT_ACTION.DECOMPOSE,
             plan_path: nextPlan.plan_path,
             content: nextPlan.content,
             pending_count: nextPlan.pending_count
           };
           // keep PLANNER role if worker_id provided
         } else {
           nextAction = { action: AGENT_ACTION.IDLE };
           // Hết plan -> chuyển sang WORKER
           if (worker_id) {
             workerRegistry.setRole(worker_id, WORKER_ROLE.WORKER);
           }
         }
         
         return {
           content: [{ type: "text", text: JSON.stringify({
             accepted: true,
             plan_completed: source_plan,
             tasks_created: tasks.length,
             next_plan: nextAction
           }) }]
         };
      } catch (err) {
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
        const maxRetries = context.config.recovery.maxTaskRetries;
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
          context.config.exchange.active, 
          `${FILE_PREFIXES.TASK}${task_id}.json`
        );
        
        if (!fs.existsSync(activePath)) {
          throw new Error(`Task ${task_id} not found in active/ directory`);
        }
        
        // Force move back to inbox (no retry increment — manual intervention)
        stateManager.moveToInbox(task_id);
        
        // Clear worker assignment if any worker owns this task
        for (const worker of workerRegistry.getAllWorkers()) {
          if (worker.current_task === task_id) {
            worker.current_task = null;
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

}
