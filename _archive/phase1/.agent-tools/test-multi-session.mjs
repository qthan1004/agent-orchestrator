import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_URL = "http://localhost:3847/mcp";

async function createClient(name) {
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client(
    { name, version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  await client.connect(transport);
  return client;
}

function parseResult(res) {
  return JSON.parse(res.content[0].text);
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║     Multi-Session Shared State Test               ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  let client1, client2;
  let passed = 0;
  let failed = 0;

  try {
    // === Step 1: Tạo 2 client connections ===
    console.log("─── Step 1: Tạo 2 client connections ───");
    client1 = await createClient("session-1");
    console.log("  ✅ Client 1 connected");

    client2 = await createClient("session-2");
    console.log("  ✅ Client 2 connected\n");

    // === Step 2: Kiểm tra status ban đầu từ client 2 ===
    console.log("─── Step 2: Check initial status (client 2) ───");
    const initialStatus = parseResult(await client2.callTool({ name: "get_status" }));
    console.log("  Status:", JSON.stringify(initialStatus, null, 2));
    console.log(`  Workers ban đầu: ${initialStatus.connected_workers}\n`);

    const baseWorkers = initialStatus.connected_workers;

    // === Step 3: Client 1 register worker ===
    console.log("─── Step 3: Client 1 → register_worker ───");
    const worker1 = parseResult(await client1.callTool({ name: "register_worker" }));
    console.log(`  Worker 1 ID: ${worker1.worker_id}`);

    // Verify worker ID format
    if (/^w-[0-9a-f]{8}$/.test(worker1.worker_id)) {
      console.log("  ✅ PASS: Worker ID format đúng (w-xxxxxxxx)");
      passed++;
    } else {
      console.log("  ❌ FAIL: Worker ID format sai!");
      failed++;
    }
    console.log();

    // === Step 4: Client 2 register worker ===
    console.log("─── Step 4: Client 2 → register_worker ───");
    const worker2 = parseResult(await client2.callTool({ name: "register_worker" }));
    console.log(`  Worker 2 ID: ${worker2.worker_id}`);

    // Verify worker ID format
    if (/^w-[0-9a-f]{8}$/.test(worker2.worker_id)) {
      console.log("  ✅ PASS: Worker ID format đúng (w-xxxxxxxx)");
      passed++;
    } else {
      console.log("  ❌ FAIL: Worker ID format sai!");
      failed++;
    }

    // Verify unique IDs
    if (worker1.worker_id !== worker2.worker_id) {
      console.log("  ✅ PASS: Worker IDs là unique (khác nhau)");
      passed++;
    } else {
      console.log("  ❌ FAIL: Worker IDs bị trùng!");
      failed++;
    }
    console.log();

    // === Step 5: Cả 2 client check status → phải cùng thấy shared state ===
    console.log("─── Step 5: Verify shared state ───");

    const status1 = parseResult(await client1.callTool({ name: "get_status" }));
    console.log(`  Client 1 thấy: connected_workers = ${status1.connected_workers}`);

    const status2 = parseResult(await client2.callTool({ name: "get_status" }));
    console.log(`  Client 2 thấy: connected_workers = ${status2.connected_workers}`);

    const expectedWorkers = baseWorkers + 2;
    if (status1.connected_workers === expectedWorkers && status2.connected_workers === expectedWorkers) {
      console.log(`  ✅ PASS: Cả 2 sessions thấy cùng state (${expectedWorkers} workers)`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: State không đồng bộ! Expected ${expectedWorkers}`);
      console.log(`          Client 1: ${status1.connected_workers}, Client 2: ${status2.connected_workers}`);
      failed++;
    }
    console.log();

    // === Step 6: Test hello_world tool vẫn hoạt động ===
    console.log("─── Step 6: Test hello_world tool ───");
    const rawRes = await client1.callTool({ name: "hello_world", arguments: { name: "Tester" } });
    const helloText = rawRes.content[0].text;
    console.log(`  Response: ${helloText}`);
    passed++;
    console.log();

  } catch (error) {
    console.error(`\n❌ Error during test: ${error.message}`);
    console.error(error.stack);
    failed++;
  } finally {
    // === Cleanup ===
    console.log("─── Cleanup: Đóng connections ───");
    if (client1) {
      try { await client1.close(); console.log("  Client 1 closed"); } catch(e) { /* ignore */ }
    }
    if (client2) {
      try { await client2.close(); console.log("  Client 2 closed"); } catch(e) { /* ignore */ }
    }

    // === Summary ===
    console.log("\n╔═══════════════════════════════════════════════════╗");
    console.log(`║  Results: ${passed} passed, ${failed} failed${' '.repeat(30 - String(passed).length - String(failed).length)}║`);
    console.log("╚═══════════════════════════════════════════════════╝");

    if (failed > 0) process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
