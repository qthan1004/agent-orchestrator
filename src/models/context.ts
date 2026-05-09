
import type { AppConfig } from "./config.js";
import type { StateManager } from "../mcp-server/state-manager.js";
import type { Logger } from "../utils/logger.js";
import type { WorkerRegistry } from "../utils/worker-registry.js";
import type { RecoveryManager } from "../mcp-server/recovery.js";
import type { PlanWatcher } from "../mcp-server/plan-watcher.js";

export interface ServerContext {
  stateManager: StateManager;
  logger: Logger;
  config: AppConfig;
  workerRegistry: WorkerRegistry;
  recoveryManager?: RecoveryManager;
  planWatcher?: PlanWatcher;
}
