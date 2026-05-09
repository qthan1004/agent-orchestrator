import { AGENT_ACTION, WORKER_ROLE, type AgentActionValue } from '../constants.js';
import type { AppConfig } from '../models/index.js';
import type { WorkerRegistry } from '../utils/worker-registry.js';
import type { CheckPlansResult, ProcessingPlanResult, StateManager } from './state-manager.js';

export interface ResolveIdleActionParams {
  stateManager: StateManager;
  workerRegistry: WorkerRegistry;
  workerId: string;
  config: AppConfig;
}

export interface IdleActionResult {
  action: AgentActionValue;
  plan_path?: string | null;
  content?: string | null;
  pending_count?: number;
}

/**
 * Khi worker không có next task, quyết định action:
 * - BECOME_PLANNER nếu có plan pending + không có active planner
 * - IDLE nếu không có gì
 */
export function resolveIdleAction({
  stateManager,
  workerRegistry,
  workerId,
  config
}: ResolveIdleActionParams): IdleActionResult {
  const planStatus = stateManager.checkPlansQuick();
  
  if (planStatus.hasPending || planStatus.hasProcessing) {
    const activePlanner = workerRegistry.getActivePlanner(config.global.recovery.plannerAliveThresholdMs);
    
    if (!activePlanner) {
      // Promote worker → planner
      workerRegistry.setRole(workerId, WORKER_ROLE.PLANNER);
      
      // Get plan content
      let planData: ProcessingPlanResult | Extract<CheckPlansResult, { status: 'ready' }> | null;
      if (planStatus.hasProcessing) {
        planData = stateManager.getProcessingPlan();
      } else {
        const result = stateManager.checkPlans(); // moves pending → processing
        planData = result.status === 'ready' ? result : null;
      }
      
      return {
        action: AGENT_ACTION.BECOME_PLANNER,
        plan_path: planData?.plan_path || null,
        content: planData?.content || null,
        pending_count: planStatus.pendingCount
      };
    }
  }
  
  return { action: AGENT_ACTION.IDLE };
}
