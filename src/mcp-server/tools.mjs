import { z } from 'zod';
import { workerRegistry } from '../utils/worker-registry.mjs';
import { TOOL_NAMES, STATE_EVENTS, TASK_STATUS, AGENT_ACTION, WORKER_ROLE } from '../constants.mjs';
import { waitForTask, waitForPlan } from './poll-helpers.mjs';
import { resolveIdleAction } from './idle-resolver.mjs';

function formatError(err) {
  return {
    content: [{ type: "text", text: `Error: ${err.message}` }],
    isError: true
  };
}

/**
 * Middleware: auto-update heartbeat cho mọi tool call có worker_id.
 * Agent không cần gọi report_progress chỉ để keepalive.
 */
function withHeartbeat(handler) {
  return async (params) => {
    if (params.worker_id) {
      workerRegistry.updateHeartbeat(params.worker_id);
    }
    return handler(params);
  };
}

export function registerTools(server, context) {
  const { stateManager, logger } = context;

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
    },
    async () => {
      try {
        const worker = workerRegistry.register();
        const status = stateManager.getStatus();
        const planStatus = stateManager.checkPlansQuick();
        const { staleThresholdMs } = context.config.recovery;
        
        // Determine role — SINGLE PLANNER enforced
        let role = WORKER_ROLE.WORKER;
        
        if (status.pending === 0 && status.active === 0) {
          // No tasks in queue
          if (planStatus.hasPending || planStatus.hasProcessing) {
            // Plans available → need planner?
            const activePlanner = workerRegistry.getActivePlanner(staleThresholdMs);
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
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              worker_id: worker.id,
              role: role,
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
              version: "0.1.0",
              uptime: process.uptime(),
              transport: "streamable-http",
              connected_workers: workerRegistry.getAllWorkers().length
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
              task_details: task,
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
    })
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
        if (!worker || worker.current_task !== task_id) {
          throw new Error("Worker does not own this task or invalid worker_id");
        }

        const result = { task_id, status, summary, worker_id, completed_at: new Date().toISOString() };
        stateManager.moveToOutbox(task_id, result);
        
        worker.current_task = null;
        worker.tasks_completed++;
        
        if (logger) {
            logger.log(STATE_EVENTS.TASK_COMPLETED, { task_id, status, worker_id });
        }

        stateManager.saveCheckpoint();
        
        // Auto pickup next task?
        if (auto_pickup && status === TASK_STATUS.DONE) {
          const nextTask = stateManager.queue.getNextTask();
          
          if (nextTask) {
            // Có task kế tiếp → assign ngay
            stateManager.moveToActive(nextTask.id);
            worker.current_task = nextTask.id;
            
            return { content: [{ type: "text", text: JSON.stringify({
              accepted: true,
              completed: task_id,
              next_task: {
                action: AGENT_ACTION.EXECUTE,
                task_id: nextTask.id,
                task_details: nextTask
              }
            }) }] };
          }
          
          // Hết task → check planner re-election
          const idleResult = resolveIdleAction({ 
            stateManager, workerRegistry, workerId: worker_id, config: context.config 
          });
          
          return { content: [{ type: "text", text: JSON.stringify({
            accepted: true,
            completed: task_id,
            next_task: idleResult  // IDLE hoặc BECOME_PLANNER
          }) }] };
        }
        
        // FAILED/BLOCKED hoặc auto_pickup=false → không auto pickup
        return { content: [{ type: "text", text: JSON.stringify({
          accepted: true,
          completed: task_id,
          next_task: { action: AGENT_ACTION.IDLE }
        }) }] };
      } catch (err) {
        return formatError(err);
      }
    })
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
    })
  );

  server.registerTool(
    TOOL_NAMES.GET_QUEUE_STATUS,
    {
      description: "Get the current queue counts and overall status",
    },
    async () => {
      try {
        const status = stateManager.getStatus();
        status.workers = workerRegistry.getAllWorkers().length;
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
          return { content: [{ type: "text", text: JSON.stringify({ 
            action: AGENT_ACTION.WAIT, 
            current: result.current 
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
  });

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
    })
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
        if (attempt > 3) throw new Error("Max retry attempt exceeded");
        stateManager.moveToInbox(task_id);
        
        return {
           content: [{ type: "text", text: JSON.stringify({ approved: true, file_path: `inbox/task-${task_id}.json` }) }]
        };
      } catch(err) {
         return formatError(err);
      }
    })
  );

}
