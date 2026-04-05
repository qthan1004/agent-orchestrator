import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3847/mcp"));
  const client = new Client(
    { name: "test-check-plans", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  console.log("✅ Connected\n");

  try {
    // Test 1: check_plans — should find pending file
    console.log("▶ Test 1: check_plans() — expect 'ready'");
    let res = await client.callTool({ name: "check_plans" });
    const result1 = JSON.parse(res.content[0].text);
    console.log("  Result:", JSON.stringify(result1, null, 2));
    console.log("  Status:", result1.status === 'ready' ? '✅ PASS' : '❌ FAIL');

    // Test 2: check_plans again — should be 'busy' (already processing)
    console.log("\n▶ Test 2: check_plans() again — expect 'busy'");
    res = await client.callTool({ name: "check_plans" });
    const result2 = JSON.parse(res.content[0].text);
    console.log("  Result:", JSON.stringify(result2, null, 2));
    console.log("  Status:", result2.status === 'busy' ? '✅ PASS' : '❌ FAIL');

    // Test 3: submit_decomposition with source_plan
    console.log("\n▶ Test 3: submit_decomposition() — should mark plan done");
    res = await client.callTool({
      name: "submit_decomposition",
      arguments: {
        tasks: [
          { id: "01-test-button", module: "ui", action: "Create HelloButton component", verification: "Button renders" }
        ],
        graph: {
          groups: [{ group_id: 1, tasks: ["01-test-button"] }]
        },
        reasoning: "Simple single-task plan",
        source_plan: result1.current
      }
    });
    const result3 = JSON.parse(res.content[0].text);
    console.log("  Result:", JSON.stringify(result3, null, 2));
    console.log("  Status:", result3.accepted ? '✅ PASS' : '❌ FAIL');

    // Test 4: check_plans — should be 'idle' now
    console.log("\n▶ Test 4: check_plans() — expect 'idle'");
    res = await client.callTool({ name: "check_plans" });
    const result4 = JSON.parse(res.content[0].text);
    console.log("  Result:", JSON.stringify(result4, null, 2));
    console.log("  Status:", result4.status === 'idle' ? '✅ PASS' : '❌ FAIL');

    console.log("\n" + "=".repeat(40));
    const allPass = result1.status === 'ready' && result2.status === 'busy' && result3.accepted && result4.status === 'idle';
    console.log(allPass ? "🎉 ALL TESTS PASSED" : "⚠ SOME TESTS FAILED");

  } finally {
    await client.close();
  }
}

main().catch(console.error);
