import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  console.log("=== Bắt đầu test quá trình chạy của MCP Server ===");
  
  // 1. Tạo transport trỏ tới endpoint /mcp của server (cổng 3847)
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3847/mcp"));
  
  // 2. Định nghĩa client
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  
  // 3. Kết nối
  console.log("▶ Đang kết nối tới server...");
  await client.connect(transport);
  console.log("✅ Kết nối thành công!");

  try {
    // Test 1: Lấy status ban đầu
    console.log("\n▶ Test 1: Gọi tool 'get_status'...");
    let statusRes = await client.callTool({ name: "get_status" });
    console.log("   Kết quả:", statusRes.content[0].text);

    // Test 2: Đăng ký một worker mới
    console.log("\n▶ Test 2: Gọi tool 'register_worker'...");
    let workerRes = await client.callTool({ name: "register_worker" });
    console.log("   Kết quả:", workerRes.content[0].text);

    // Test 3: Lấy status sau khi đã đăng ký worker
    console.log("\n▶ Test 3: Gọi lại 'get_status' để verify shared state...");
    statusRes = await client.callTool({ name: "get_status" });
    console.log("   Kết quả:", statusRes.content[0].text);

  } catch (error) {
    console.error("❌ Lỗi khi test tool:", error.message);
  } finally {
    // Đóng kết nối an toàn để không bị treo
    console.log("\n🛑 Đóng kết nối client...");
    await client.close();
  }
}

main().catch(console.error);
