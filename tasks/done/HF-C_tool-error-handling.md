# Hotfix C: Tool Error Handling + Skill Reference Update

- **Phase**: Hotfix — Multi-session Transport Fix
- **Goal**: Thêm try-catch cho tool callbacks + update skill reference pattern
- **Priority**: 🟡 Medium

## Files

| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.mjs` |
| MODIFY | `.agent/skills/mcp-sdk-reference/SKILL.md` |

## What to Do

### 1. Tool Error Handling — `tools.mjs`

Bọc mỗi tool callback trong try-catch, trả `{ isError: true }` khi có lỗi:

**Trước:**
```javascript
server.registerTool('register_worker', {
  description: "Register a new worker and get a unique UUID",
}, async () => {
  const worker = workerRegistry.register();
  return {
    content: [{ type: "text", text: JSON.stringify({ worker_id: worker.id }) }]
  };
});
```

**Sau:**
```javascript
server.registerTool(TOOL_NAMES.REGISTER_WORKER, {
  description: "Register a new worker and get a unique UUID",
}, async () => {
  try {
    const worker = workerRegistry.register();
    return {
      content: [{ type: "text", text: JSON.stringify({ worker_id: worker.id }) }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true
    };
  }
});
```

Áp dụng pattern này cho **cả 3 tools**: `hello_world`, `register_worker`, `get_status`.

### 2. Update Skill Reference — `SKILL.md`

Section "2. Streamable HTTP Server" hiện đang sai (dùng single server + multi transport).

**Trước:**
```javascript
// Stateful: session management
const sessions = new Map();
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport = sessions.get(sessionId);
  if (!transport) {
    transport = new StreamableHTTPServerTransport({...});
    await server.connect(transport);  // ← SAI: singleton server
    sessions.set(transport.sessionId, transport);
  }
  await transport.handleRequest(req, res, req.body);
});
```

**Sau:**
```javascript
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Factory: mỗi session = 1 server mới
const transports = {};
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].handleRequest(req, res, req.body);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (sid) => { transports[sid] = transport; }
    });
    const server = createServer();  // ← ĐÚNG: factory
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
});
```

Cũng update Tool Pattern section thêm try-catch example.

## Constraints

- Không thay đổi tool logic / behavior — chỉ thêm error wrapping
- Skill reference phải match actual code sau HF-A và HF-B

## Dependencies

- **Phụ thuộc HF-B** (code phải ổn trước khi update docs)

## Verification

```bash
# Tools vẫn hoạt động bình thường
node tools/test-mcp-client.mjs

# Verify skill file không bị syntax error
cat .agent/skills/mcp-sdk-reference/SKILL.md
```

## Done Criteria

- [x] Cả 3 tool callbacks có try-catch wrapper
- [x] Error responses trả `{ isError: true }` 
- [x] Skill reference section 2 + 3 cập nhật theo factory pattern
- [x] Ghi observations vào `plan/orchestrator_poc-observations_v0.1.md`
