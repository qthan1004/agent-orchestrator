#!/usr/bin/env node
/**
 * Comprehensive test: calls ALL 11 MCP tools in sequence.
 * Validates the full orchestrator workflow: register → decompose → assign → execute → complete.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const URL_ENDPOINT = "http://localhost:3847/mcp";

let pass = 0;
let fail = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label} ${detail}`);
    fail++;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Comprehensive MCP Tools Test Suite      ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const transport = new StreamableHTTPClientTransport(new URL(URL_ENDPOINT));
  const client = new Client(
    { name: "test-suite", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  console.log("✅ Connected to server\n");

  // List all available tools
  console.log("▶ Listing all registered tools...");
  const toolList = await client.listTools();
  const toolNames = toolList.tools.map(t => t.name);
  console.log(`  Found ${toolNames.length} tools: ${toolNames.join(', ')}`);
  assert("At least 10 tools registered", toolNames.length >= 10, `(got ${toolNames.length})`);

  // ──── TOOL 1: hello_world ────
  console.log("\n▶ Test 1: hello_world");
  const hello = await client.callTool({ name: "hello_world", arguments: { name: "TestBot" } });
  const helloText = hello.content[0].text;
  assert("Returns greeting", helloText.includes("Hello, TestBot"), helloText);

  // ──── TOOL 2: get_status ────
  console.log("\n▶ Test 2: get_status");
  const status = await client.callTool({ name: "get_status" });
  const statusData = JSON.parse(status.content[0].text);
  assert("Has server field", statusData.server === "orchestrator");
  assert("Has uptime", statusData.uptime > 0);
  assert("Has version", statusData.version === "0.1.0");

  // ──── TOOL 3: register_worker ────
  console.log("\n▶ Test 3: register_worker");
  const worker = await client.callTool({ name: "register_worker" });
  const { worker_id } = JSON.parse(worker.content[0].text);
  assert("Returns worker_id", worker_id && worker_id.startsWith("w-"), worker_id);

  // ──── TOOL 4: get_queue_status (empty) ────
  console.log("\n▶ Test 4: get_queue_status (empty queue)");
  const qs = await client.callTool({ name: "get_queue_status" });
  const qsData = JSON.parse(qs.content[0].text);
  assert("Total is 0", qsData.total === 0, `(got ${qsData.total})`);
  assert("Has workers count", qsData.workers >= 1);

  // ──── TOOL 5: get_plan_for_decomposition ────
  console.log("\n▶ Test 5: get_plan_for_decomposition");
  const plan = await client.callTool({ name: "get_plan_for_decomposition" });
  const planData = JSON.parse(plan.content[0].text);
  assert("Returns plan_file_path", !!planData.plan_file_path);
  assert("Returns template_path", !!planData.template_path);

  // ──── TOOL 6: submit_decomposition ────
  console.log("\n▶ Test 6: submit_decomposition");
  const decomp = await client.callTool({
    name: "submit_decomposition",
    arguments: {
      tasks: [
        { id: "01-create-hello", module: "files", action: "Create hello.md", verification: "File exists" },
        { id: "02-update-readme", module: "files", action: "Update README", verification: "Section exists" },
        { id: "03-verify-all", module: "verify", action: "Check all files", verification: "CI green" }
      ],
      graph: {
        groups: [
          { group_id: 1, tasks: ["01-create-hello", "02-update-readme"] },
          { group_id: 2, tasks: ["03-verify-all"], depends_on: [1] }
        ]
      },
      reasoning: "Split into parallel create tasks + sequential verify"
    }
  });
  const decompData = JSON.parse(decomp.content[0].text);
  assert("Decomposition accepted", decompData.accepted === true, JSON.stringify(decompData));

  // ──── TOOL 7: get_queue_status (with tasks) ────
  console.log("\n▶ Test 7: get_queue_status (after decompose)");
  const qs2 = await client.callTool({ name: "get_queue_status" });
  const qs2Data = JSON.parse(qs2.content[0].text);
  assert("Total is 3", qs2Data.total === 3, `(got ${qs2Data.total})`);
  assert("Pending is 3", qs2Data.pending === 3, `(got ${qs2Data.pending})`);

  // ──── TOOL 8: get_next_task ────
  console.log("\n▶ Test 8: get_next_task");
  const next = await client.callTool({ name: "get_next_task", arguments: { worker_id } });
  const nextData = JSON.parse(next.content[0].text);
  assert("Returns task_id", !!nextData.task_id, nextData.task_id || 'null');
  assert("Returns file_path", !!nextData.file_path);
  const firstTaskId = nextData.task_id;

  // ──── TOOL 9: report_progress ────
  console.log("\n▶ Test 9: report_progress");
  const progress = await client.callTool({
    name: "report_progress",
    arguments: { task_id: firstTaskId, step: "Creating file", percentage: 50, worker_id }
  });
  assert("Progress acknowledged", progress.content[0].text === "ok");

  // ──── TOOL 10: complete_task ────
  console.log("\n▶ Test 10: complete_task");
  const complete = await client.callTool({
    name: "complete_task",
    arguments: { task_id: firstTaskId, status: "done", summary: "Created hello.md", worker_id }
  });
  const completeData = JSON.parse(complete.content[0].text);
  assert("Task completion accepted", completeData.accepted === true);
  assert("Returns next_unlocked array", Array.isArray(completeData.next_unlocked));

  // Get 2nd task + complete it
  console.log("\n▶ Test 10b: Complete second parallel task");
  const next2 = await client.callTool({ name: "get_next_task", arguments: { worker_id } });
  const next2Data = JSON.parse(next2.content[0].text);
  assert("Got second task", !!next2Data.task_id);
  
  if (next2Data.task_id) {
    const c2 = await client.callTool({
      name: "complete_task",
      arguments: { task_id: next2Data.task_id, status: "done", summary: "Updated README", worker_id }
    });
    const c2Data = JSON.parse(c2.content[0].text);
    assert("Second task completed", c2Data.accepted === true);
    assert("Group 2 task unlocked", c2Data.next_unlocked.includes("03-verify-all"), 
           `unlocked: ${JSON.stringify(c2Data.next_unlocked)}`);
  }

  // ──── TOOL 11: get_checkpoint ────
  console.log("\n▶ Test 11: get_checkpoint");
  const cp = await client.callTool({ name: "get_checkpoint" });
  const cpData = JSON.parse(cp.content[0].text);
  assert("Returns checkpoint path", cpData.checkpoint_file_path && cpData.checkpoint_file_path.includes("checkpoint"));

  // ──── TOOL 12: test_error (bonus) ────
  console.log("\n▶ Test 12: test_error");
  const errRes = await client.callTool({ name: "test_error" });
  assert("Error flagged", errRes.isError === true);
  assert("Error message present", errRes.content[0].text.includes("Error:"));

  // ──── TOOL 13: request_retry ────
  console.log("\n▶ Test 13: request_retry");
  const retry = await client.callTool({
    name: "request_retry",
    arguments: { task_id: firstTaskId, reason: "Testing retry", attempt: 1 }
  });
  const retryData = JSON.parse(retry.content[0].text);
  assert("Retry approved", retryData.approved === true);
  assert("Returns file_path", !!retryData.file_path);

  // Final status
  console.log("\n▶ Final: get_queue_status");
  const finalQs = await client.callTool({ name: "get_queue_status" });
  const finalData = JSON.parse(finalQs.content[0].text);
  console.log(`  Queue: total=${finalData.total}, pending=${finalData.pending}, active=${finalData.active}, done=${finalData.done}`);

  // Summary
  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  Results: ${pass} passed, ${fail} failed${' '.repeat(18 - pass.toString().length - fail.toString().length)}║`);
  console.log("╚══════════════════════════════════════════╝");

  await client.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
