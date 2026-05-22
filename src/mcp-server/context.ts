import type { AppConfig } from "../models/config.js";
import type { StateManager } from "./state-manager.js";
import type { Logger } from "../utils/logger.js";
import type { WorkerRegistry } from "../utils/worker-registry.js";
import type { RecoveryManager } from "./recovery.js";
import type { PlanWatcher } from "./plan-watcher.js";

export interface ServerContext {
  stateManager: StateManager;
  logger: Logger;
  config: AppConfig;
  workerRegistry: WorkerRegistry;
  recoveryManager?: RecoveryManager;
  planWatcher?: PlanWatcher;
}
