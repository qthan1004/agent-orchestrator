import { StateManager } from './src/mcp-server/state-manager.mjs';
import { WorkerRegistry } from './src/utils/worker-registry.mjs';
import { resolveIdleAction } from './src/mcp-server/idle-resolver.mjs';

const stateManager = new StateManager(null);
const workerRegistry = new WorkerRegistry();
const config = { recovery: { staleThresholdMs: 300000 } };

const worker = workerRegistry.register();

// Test 1
console.log('Test 1:', resolveIdleAction({ stateManager, workerRegistry, workerId: worker.id, config }));

// Test 2 (mock plan)
// Note: requires mocking or creating a pending plan
