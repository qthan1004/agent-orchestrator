/**
 * End-to-End Full Flow Test
 * 
 * Drives the complete orchestrator cycle via raw HTTP → MCP JSON-RPC:
 *   1. Initialize MCP session
 *   2. register_worker
 *   3. get_queue_status (should be empty)
 *   4. submit_decomposition (3 tasks, 2 groups)
 *   5. get_queue_status (should show 3 pending)
 *   6. get_next_task → complete_task loop
 *   7. Verify DAG ordering (task 03 only after 01+02)
 *   8. Final verification
 */

import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3847';
const SOURCE_PLAN = 'e2e-flow-test.md';
const TASK_IDS = {
  create: 'e2e-flow-test-01-create-hello',
  update: 'e2e-flow-test-02-update-readme',
  verify: 'e2e-flow-test-03-verify-all'
};
let sessionId: string | null = null;
let requestId = 0;
const results: {
  steps: Array<{ name: string; pass: boolean; data: unknown }>;
  errors: string[];
  dagOrder: string[];
} = { steps: [], errors: [], dagOrder: [] };

// ─── Helpers ─────────────────────────────────────────────────

function nextId() { return ++requestId; }

async function mcpRequest(method: string, params: Record<string, unknown> = {}) {
  const id = nextId();
  const body: {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params: Record<string, unknown>;
  } = { jsonrpc: '2.0', id, method: 'tools/call', params: { name: method, arguments: params } };

  // Special case for initialize
  if (method === 'initialize') {
    body.method = 'initialize';
    body.params = {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '1.0.0' }
    };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const res = await fetch(`${BASE}/mcp`, { method: 'POST', headers, body: JSON.stringify(body) });

  // Capture session ID from response
  const newSessionId = res.headers.get('mcp-session-id');
  if (newSessionId) sessionId = newSessionId;

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    // Parse SSE response
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          return data;
        } catch(e) { /* skip non-json lines */ }
      }
    }
    throw new Error('No valid SSE data received');
  }

  return res.json();
}

function extractToolResult(response: any) {
  if (response.result?.content?.[0]?.text) {
    try {
      return JSON.parse(response.result.content[0].text);
    } catch {
      return response.result.content[0].text;
    }
  }
  return response;
}

function logStep(name: string, data: unknown, pass = true) {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (data && typeof data === 'object') console.log(`   `, JSON.stringify(data));
  results.steps.push({ name, pass, data });
  if (!pass) results.errors.push(name);
}

function prepareTestPlan() {
  fs.mkdirSync(path.join('plan', 'processing'), { recursive: true });
  fs.mkdirSync(path.join('plan', 'done'), { recursive: true });
  fs.mkdirSync(path.join('exchange', '.tmp'), { recursive: true });
  fs.writeFileSync(
    path.join('plan', 'processing', SOURCE_PLAN),
    '# E2E Flow Test\n\nTemporary source plan for submit_decomposition.\n',
    'utf8'
  );
}

// ─── Test Flow ───────────────────────────────────────────────

async function run() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   E2E Full Flow Test — Hello Orchestrator     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  prepareTestPlan();

  // 1. Initialize MCP session
  console.log('── Step 1: Initialize MCP Session ──');
  const initRes = await mcpRequest('initialize');
  const hasSession = !!sessionId;
  logStep('MCP Session initialized', { sessionId: sessionId?.slice(0, 8) + '...' }, hasSession);
  if (!hasSession) { console.error('FATAL: No session. Aborting.'); process.exit(1); }

  // 2. Register worker
  console.log('\n── Step 2: Register Worker ──');
  const regRes = await mcpRequest('register_worker');
  const regData = extractToolResult(regRes);
  const workerId = regData.worker_id;
  logStep('Worker registered', { worker_id: workerId?.slice(0, 8) + '...' }, !!workerId);

  // 3. Get queue status (should be empty)
  console.log('\n── Step 3: Check Queue Status (empty) ──');
  const qs1Res = await mcpRequest('get_queue_status');
  const qs1 = extractToolResult(qs1Res);
  logStep('Queue is empty', qs1, qs1.total === 0);

  // 4. Submit decomposition (3 tasks, 2 groups)
  console.log('\n── Step 4: Submit Decomposition ──');
  const tasks = [
    { id: '01-create-hello', module: 'files', action: 'Create hello.md with content "Hello from Orchestrator!"', verification: 'File hello.md exists with correct content' },
    { id: '02-update-readme', module: 'files', action: 'Update README.md with Orchestrator Status section', verification: 'README.md contains "## Orchestrator Status"' },
    { id: '03-verify-all', module: 'verify', action: 'Verify both hello.md and README.md updates', verification: 'Both files exist and contain expected content' }
  ];
  const graph = {
    groups: [
      { group_id: 1, tasks: ['01-create-hello', '02-update-readme'] },
      { group_id: 2, tasks: ['03-verify-all'], depends_on: [1] }
    ]
  };
  const reasoning = 'Tasks 1+2 are independent file creations. Task 3 verifies both, so depends on group 1.';

  const subRes = await mcpRequest('submit_decomposition', { tasks, graph, reasoning, source_plan: SOURCE_PLAN });
  const subData = extractToolResult(subRes);
  logStep('Decomposition accepted', subData, subData.accepted === true);

  // 5. Get queue status (should show 3 pending)
  console.log('\n── Step 5: Check Queue Status (3 pending) ──');
  const qs2Res = await mcpRequest('get_queue_status');
  const qs2 = extractToolResult(qs2Res);
  logStep('Queue shows 3 tasks', qs2, qs2.total === 3 && qs2.pending === 3);

  // 6. Task execution loop
  console.log('\n── Step 6: Execute Tasks ──');
  let loopCount = 0;
  const maxLoops = 5; // safety limit
  let queuedTask: any = null;

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`\n  → Loop ${loopCount}:`);

    // Get next task, or continue with the auto-pick returned by complete_task.
    let nextData = queuedTask;
    queuedTask = null;

    if (!nextData) {
      const nextRes = await mcpRequest('get_next_task', { worker_id: workerId });
      nextData = extractToolResult(nextRes);
    }

    if (!nextData.task_id) {
      console.log('  No more tasks available.');
      break;
    }

    const taskId = nextData.task_id;
    console.log(`  📋 Got task: ${taskId} (file: ${nextData.file_path})`);
    results.dagOrder.push(taskId);

    // Report progress
    await mcpRequest('report_progress', {
      task_id: taskId,
      step: `Executing ${taskId}`,
      percentage: 50,
      worker_id: workerId
    });

    // Complete the task
    const completeRes = await mcpRequest('complete_task', {
      task_id: taskId,
      status: 'done',
      summary: `Completed ${taskId} successfully`,
      worker_id: workerId
    });
    const completeData = extractToolResult(completeRes);
    logStep(`Task ${taskId} completed`, completeData, completeData.accepted === true);

    if (completeData.next_task?.action === 'EXECUTE') {
      queuedTask = completeData.next_task;
    }
  }

  // 7. Verify DAG ordering
  console.log('\n── Step 7: Verify DAG Ordering ──');
  const verifyIdx = results.dagOrder.indexOf(TASK_IDS.verify);
  const createIdx = results.dagOrder.indexOf(TASK_IDS.create);
  const updateIdx = results.dagOrder.indexOf(TASK_IDS.update);
  const dagCorrect = verifyIdx > createIdx && verifyIdx > updateIdx;
  logStep('DAG ordering correct (03 after 01+02)', {
    execution_order: results.dagOrder,
    '03_verify_index': verifyIdx,
    '01_create_index': createIdx,
    '02_update_index': updateIdx
  }, dagCorrect);

  // 8. Final queue status
  console.log('\n── Step 8: Final Verification ──');
  const qsFinalRes = await mcpRequest('get_queue_status');
  const qsFinal = extractToolResult(qsFinalRes);
  const allDone =
    qsFinal.pending === 0 &&
    qsFinal.active === 0 &&
    qsFinal.failed === 0 &&
    qsFinal.blocked === 0 &&
    (qsFinal.done === 3 || qsFinal.total === 0);
  logStep('All tasks done', qsFinal, allDone);

  // 9. Get checkpoint
  const cpRes = await mcpRequest('get_checkpoint');
  const cpData = extractToolResult(cpRes);
  logStep('Checkpoint saved', cpData, !!cpData.checkpoint_file_path);

  // ─── Summary ────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║               TEST SUMMARY                    ║');
  console.log('╚═══════════════════════════════════════════════╝');
  const totalSteps = results.steps.length;
  const passed = results.steps.filter(s => s.pass).length;
  const failed = results.steps.filter(s => !s.pass).length;

  console.log(`  Total steps: ${totalSteps}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 DAG order: ${results.dagOrder.join(' → ')}`);

  if (failed > 0) {
    console.log(`\n  Failed steps:`);
    for (const err of results.errors) console.log(`    - ${err}`);
  }

  console.log(`\n  Result: ${failed === 0 ? '🎉 ALL PASSED' : '💥 FAILED'}`);

  // Write results JSON for post-analysis
  fs.writeFileSync('exchange/.tmp/e2e-results.json', JSON.stringify(results, null, 2));
  console.log('  Results saved to: exchange/.tmp/e2e-results.json');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
