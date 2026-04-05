import { z } from 'zod';
import { workerRegistry } from '../utils/worker-registry.mjs';
import { TOOL_NAMES, STATE_EVENTS, TASK_STATUS } from '../constants.mjs';

function formatError(err) {
  return {
    content: [{ type: "text", text: `Error: ${err.message}` }],
    isError: true
  };
}

export function registerTools(server, context) {
  const { stateManager, logger } = context;

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
        return {
          content: [{ type: "text", text: JSON.stringify({ worker_id: worker.id }) }]
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
    async ({ worker_id }) => {
      try {
        const worker = workerRegistry.getWorker(worker_id);
        if (!worker) throw new Error("Invalid worker_id");

        const task = stateManager.queue.getNextTask();
        if (!task) {
           return {
             content: [{ type: "text", text: JSON.stringify({ task_id: null, file_path: null }) }]
           };
        }

        stateManager.moveToActive(task.id);
        worker.current_task = task.id;
        
        if (logger) {
            logger.log(STATE_EVENTS.TASK_ASSIGNED, { task_id: task.id, worker_id });
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ task_id: task.id, file_path: `active/task-${task.id}.json` }) }]
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
    async ({ task_id, status, summary, worker_id }) => {
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

        const unlockedTasks = stateManager.queue.getUnlockedTasks().map(t => t.id);
        stateManager.saveCheckpoint();

        return {
          content: [{ type: "text", text: JSON.stringify({ accepted: true, next_unlocked: unlockedTasks }) }]
        };
      } catch (err) {
        return formatError(err);
      }
    }
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
    async ({ task_id, step, percentage, worker_id }) => {
      try {
        const worker = workerRegistry.getWorker(worker_id);
        if (!worker) throw new Error("Invalid worker_id");
        workerRegistry.updateHeartbeat(worker_id);
        
        if (logger) {
            logger.log(STATE_EVENTS.PROGRESS, { task_id, step, percentage, worker_id });
        }
        
        return {
          content: [{ type: "text", text: "ok" }]
        };
      } catch (err) {
         return formatError(err);
      }
    }
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
        const result = stateManager.checkPlans();
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
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
        source_plan: z.string().describe("Filename of the plan being decomposed (from check_plans)")
      }
    },
    async ({ tasks, graph, reasoning, source_plan }) => {
      try {
         // Throws if circular deps
         stateManager.storeTasks(tasks, graph);
         stateManager.completePlan(source_plan);
        return {
          content: [{ type: "text", text: JSON.stringify({ accepted: true, plan_completed: source_plan }) }]
        };
      } catch (err) {
         return {
          content: [{ type: "text", text: JSON.stringify({ accepted: false, errors: [err.message] }) }]
        };
      }
    }
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
    async ({ task_id, reason, attempt }) => {
      try {
        if (attempt > 3) throw new Error("Max retry attempt exceeded");
        stateManager.moveToInbox(task_id);
        
        return {
           content: [{ type: "text", text: JSON.stringify({ approved: true, file_path: `inbox/task-${task_id}.json` }) }]
        };
      } catch(err) {
         return formatError(err);
      }
    }
  );

}
