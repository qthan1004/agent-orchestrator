import fs from 'fs';
import path from 'path';
import { StateManager } from './src/mcp-server/state-manager.mjs';
import { registerTools } from './src/mcp-server/tools.mjs';
import { workerRegistry } from './src/utils/worker-registry.mjs';

const sm = new StateManager(console);
const server = {
    tools: {},
    registerTool: function(name, schema, handler) {
        this.tools[name] = handler;
    }
};

registerTools(server, { stateManager: sm, logger: console, config: { exchange: sm.config.exchange, recovery: {}, polling: {} } });

async function runTest() {
    console.log("Starting test...");
    // 1. Create a dummy task in active
    const activePath = path.join(sm.config.exchange.active, 'task-test-123.json');
    fs.writeFileSync(activePath, JSON.stringify({id: 'test-123'}));
    
    // Assign to a worker
    const worker = workerRegistry.register();
    worker.current_task = 'test-123';
    
    // Release
    const res1 = await server.tools.force_release_task({task_id: 'test-123', reason: 'locked'});
    console.log("Release valid:", res1.content[0].text);
    
    // Assert moved to inbox
    const inboxPath = path.join(sm.config.exchange.inbox, 'task-test-123.json');
    if (!fs.existsSync(inboxPath) || fs.existsSync(activePath)) {
        console.error("FAIL: File not moved correctly");
        process.exit(1);
    }
    
    // Assert worker cleared
    if (workerRegistry.getWorker(worker.id).current_task !== null) {
        console.error("FAIL: Worker assignment not cleared");
        process.exit(1);
    }
    
    // 2. Release invalid
    const res2 = await server.tools.force_release_task({task_id: 'invalid-456', reason: 'locked'});
    if (!res2.isError) {
        console.error("FAIL: Did not return error for invalid task");
        process.exit(1);
    }
    console.log("Release invalid Error correctly format:", res2.content[0].text);
    
    console.log("ALL TESTS PASSED");
    process.exit(0);
}

runTest();
