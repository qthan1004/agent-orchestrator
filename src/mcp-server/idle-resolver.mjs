import { AGENT_ACTION, WORKER_ROLE } from '../constants.mjs';

/**
 * Khi worker không có next task, quyết định action:
 * - BECOME_PLANNER nếu có plan pending + không có active planner
 * - IDLE nếu không có gì
 */
export function resolveIdleAction({ stateManager, workerRegistry, workerId, config }) {
  const planStatus = stateManager.checkPlansQuick();
  
  if (planStatus.hasPending || planStatus.hasProcessing) {
    const activePlanner = workerRegistry.getActivePlanner(config.recovery.staleThresholdMs);
    
    if (!activePlanner) {
      // Promote worker → planner
      workerRegistry.setRole(workerId, WORKER_ROLE.PLANNER);
      
      // Get plan content
      let planData;
      if (planStatus.hasProcessing) {
        planData = stateManager.getProcessingPlan();
      } else {
        planData = stateManager.checkPlans(); // moves pending → processing
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
