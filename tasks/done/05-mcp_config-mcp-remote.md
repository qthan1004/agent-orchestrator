# Config mcp-remote + Cross-platform Config

- **Phase**: A2 — Streamable HTTP + mcp-remote
- **Goal**: Config Antigravity dùng mcp-remote bridge, tạo config.mjs cross-platform

## Files

| Action | Path |
|--------|------|
| NEW | `src/config.mjs` |
| MODIFY | `~/.gemini/antigravity/mcp_config.json` |

## What to Do

1. Tạo `src/config.mjs`:
   ```javascript
   import { resolve, join } from 'path';
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';

   const __dirname = dirname(fileURLToPath(import.meta.url));

   export function loadConfig(overrides = {}) {
     const root = overrides.root || resolve(__dirname, '..');
     return {
       root,
       exchange: {
         base: join(root, 'exchange'),
         inbox: join(root, 'exchange', 'inbox'),
         active: join(root, 'exchange', 'active'),
         outbox: join(root, 'exchange', 'outbox'),
         checkpoints: join(root, 'exchange', 'checkpoints'),
         logs: join(root, 'exchange', 'logs'),
       },
       templates: join(root, 'templates'),
       plans: join(root, 'plan'),
       server: {
         port: overrides.port || 3847,
         host: '127.0.0.1',
       }
     };
   }
   ```

2. Update `mcp_config.json` — chuyển từ stdio sang mcp-remote:
   ```json
   {
     "mcpServers": {
       "orchestrator": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "http://localhost:3847/mcp",
           "--transport", "http-first"
         ]
       }
     }
   }
   ```

3. Update `src/mcp-server/index.mjs` để dùng `loadConfig()` cho port/host

## Constraints

- `config.mjs` PHẢI dùng `import.meta.url` + `path.join()` — cross-platform
- KHÔNG hardcode absolute paths
- KHÔNG dùng `process.platform` hay `os.platform()`

## Dependencies

- `04-mcp_streamable-http` phải xong trước

## Verification

```bash
# Terminal 1: Start server
node src/index.mjs serve

# Terminal 2: Verify mcp-remote connects
npx -y mcp-remote http://localhost:3847/mcp --transport http-first
```

Sau đó: Mở Antigravity session → gọi `hello_world` hoặc `get_status` → verify.

## Done Criteria

- [x] `src/config.mjs` tồn tại, export `loadConfig()`
- [x] `mcp_config.json` dùng `mcp-remote` thay vì direct stdio
- [x] Antigravity session connect qua mcp-remote → gọi tools OK
- [x] Config paths hoạt động trên cả Windows lẫn Linux (dùng `path.join`)
