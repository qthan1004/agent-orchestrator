/**
 * ARCHIVED: Pull-model tool snippets from src/mcp-server/tools.ts
 * These were removed to enforce unidirectional Head→Body→Worker flow.
 * Date: 2026-05-10
 */

// ═══════════════════════════════════════════════════════════════
// TOOL: get_next_task (pull-model — worker self-selects task)
// ═══════════════════════════════════════════════════════════════

/*
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
        const { pollTimeoutMs, checkIntervalMs } = context.config.global.polling;
        const task = await waitForTask(stateManager.queue, { 
          timeoutMs: pollTimeoutMs, 
          checkIntervalMs 
        });
        
        if (!task) {
          // No task → check if should become planner
          const idleResult = resolveIdleAction({ stateManager, workerRegistry, workerId: worker_id, config: context.config });
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
*/

// ═══════════════════════════════════════════════════════════════
// auto_pickup + tryAutoPickup() from complete_task
// ═══════════════════════════════════════════════════════════════

/*
  // In complete_task inputSchema:
  auto_pickup: z.boolean().optional().default(true).describe("Auto-pickup next task")

  // tryAutoPickup helper:
  const tryAutoPickup = (responseBase: Record<string, unknown>): ToolResponse => {
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

    const idleResult = resolveIdleAction({ 
      stateManager, workerRegistry, workerId: worker_id, config: context.config 
    });
    return { content: [{ type: "text", text: JSON.stringify({
      ...responseBase,
      next_task: idleResult
    }) }] };
  };
*/

// ═══════════════════════════════════════════════════════════════
// TOOL: check_plans (planner pull-model)
// ═══════════════════════════════════════════════════════════════

/*
  server.registerTool(
    TOOL_NAMES.CHECK_PLANS,
    {
      description: "Check for new plan files in plan/pending/...",
    },
    async () => {
      try {
        const { planPollTimeoutMs, checkIntervalMs } = context.config.global.polling;
        const result = await waitForPlan(stateManager, {
          timeoutMs: planPollTimeoutMs,
          checkIntervalMs: checkIntervalMs * 2
        });
        
        if (result.status === 'idle') {
          return { content: [{ type: "text", text: JSON.stringify({ action: AGENT_ACTION.IDLE }) }] };
        }
        
        if (result.status === 'busy') {
          return { content: [{ type: "text", text: JSON.stringify({ 
            action: AGENT_ACTION.DECOMPOSE, 
            plan_path: result.plan_path,
            content: result.content,
            pending_count: result.pending_count
          }) }] };
        }
        
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
*/

// ═══════════════════════════════════════════════════════════════
// Role auto-assignment in register_worker
// ═══════════════════════════════════════════════════════════════

/*
  // In register_worker:
  // Determine role — SINGLE PLANNER enforced
  let role: WorkerRoleValue = WORKER_ROLE.WORKER;
  
  if (status.pending === 0 && status.active === 0) {
    if (planStatus.hasPending || planStatus.hasProcessing) {
      const activePlanner = workerRegistry.getActivePlanner(plannerAliveThresholdMs);
      if (!activePlanner) {
        role = WORKER_ROLE.PLANNER;
      } else {
        role = WORKER_ROLE.IDLE;
      }
    } else {
      role = WORKER_ROLE.IDLE;
    }
  }
  workerRegistry.setRole(worker.id, role);
*/

// ═══════════════════════════════════════════════════════════════
// Role transition in submit_decomposition
// ═══════════════════════════════════════════════════════════════

/*
  // After decomposition:
  if (!planStatus.hasPending) {
    // Hết plan -> chuyển sang WORKER
    if (worker_id) {
      workerRegistry.setRole(worker_id, WORKER_ROLE.WORKER);
    }
  }
*/

// ═══════════════════════════════════════════════════════════════
// SERVER_PROFILES.DEFAULT (IDE mode)
// ═══════════════════════════════════════════════════════════════

/*
  DEFAULT: {
    staleThresholdMs: 30 * 60_000,    // 30 minutes
    autoKillWorker: false,
    workerType: 'IDE' as const,
    maxConcurrentWorkers: 1,
    roleManagement: 'blurred' as const,
  },
*/
