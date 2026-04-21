/**
 * Quick E2E test for scan_workspace tool via MCP HTTP.
 * Usage: npx tsx tests/test-scan-workspace.ts
 * Requires server running on port 3847.
 */
import http from 'http';

interface HttpResult {
  status: number | undefined;
  headers: http.IncomingHttpHeaders;
  body: string;
  contentType: string | undefined;
}

function post(path: string, body: object, headers: Record<string, string> = {}): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1', port: 3847, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(data), ...headers }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', (c: Buffer) => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d, contentType: res.headers['content-type'] }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/** Parse SSE or JSON response body into JSON-RPC result */
function parseResponse(raw: string, contentType: string | undefined): any {
  if (contentType && contentType.includes('text/event-stream')) {
    const lines = raw.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6);
        try { return JSON.parse(json); } catch { /* skip non-json data lines */ }
      }
    }
    throw new Error('No valid JSON data in SSE response');
  }
  return JSON.parse(raw);
}

async function main(): Promise<void> {
  // Step 1: Initialize session
  console.log('1. Initializing MCP session...');
  const initRes = await post('/mcp', {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
  });

  const sid = initRes.headers['mcp-session-id'] as string | undefined;
  if (!sid) {
    console.error('❌ No session ID in response headers');
    console.log('Response:', initRes.body);
    process.exit(1);
  }
  console.log(`   Session ID: ${sid}`);

  // Send initialized notification
  await post('/mcp',
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { 'mcp-session-id': sid }
  );

  // Step 2: Call scan_workspace with force_update: true
  console.log('2. Calling scan_workspace(force_update: true)...');
  const scanRes = await post('/mcp',
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'scan_workspace', arguments: { force_update: true } } },
    { 'mcp-session-id': sid }
  );

  const scanBody = parseResponse(scanRes.body, scanRes.contentType);
  const result = JSON.parse(scanBody.result?.content?.[0]?.text || '{}');
  console.log('   Status:', result.status);
  console.log('   Stats:', JSON.stringify(result.stats));

  if (result.status !== 'generated') {
    console.error('❌ Expected status "generated", got:', result.status);
    process.exit(1);
  }
  console.log('   ✅ scan_workspace generated workspace-memory.md');

  // Step 3: Call again without force_update → should return CACHED
  console.log('3. Calling scan_workspace(force_update: false)...');
  const cachedRes = await post('/mcp',
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'scan_workspace', arguments: { force_update: false } } },
    { 'mcp-session-id': sid }
  );

  const cachedBody = parseResponse(cachedRes.body, cachedRes.contentType);
  const cachedResult = JSON.parse(cachedBody.result?.content?.[0]?.text || '{}');
  console.log('   Status:', cachedResult.status);

  if (cachedResult.status !== 'cached') {
    console.error('❌ Expected status "cached", got:', cachedResult.status);
    process.exit(1);
  }
  console.log('   ✅ Correctly returned CACHED');

  console.log('\n✅ All scan_workspace tests PASSED');
}

main().catch((err: Error) => { console.error('❌ Test failed:', err.message); process.exit(1); });
