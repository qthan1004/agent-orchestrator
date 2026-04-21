# Task EV04: MCP Config Enhancement

## Info
- **ID:** EV04-mcp-config-enhancement
- **Module:** AG global config
- **Group:** 1 (AG Ecosystem Setup)
- **Dependencies:** none
- **Priority:** 4
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 1, §1.6

## What to do

Cập nhật MCP config để thêm `background: "always"` cho các tool heartbeat/ping — tránh block conversation khi tool chạy ngầm.

### MCP Config path

```
Windows: %USERPROFILE%\.gemini\antigravity\mcp_config.json
Linux:   ~/.gemini/antigravity/mcp_config.json
```

### [MODIFY] `mcp_config.json`

Thêm/cập nhật entry cho agent-orchestrator:

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "node",
      "args": ["<WORKSPACE>/src/index.mjs", "serve"],
      "cwd": "<WORKSPACE>",
      "tools": {
        "ping": { "background": "always" }
      }
    }
  }
}
```

> **Lưu ý:** Thay `<WORKSPACE>` bằng absolute path thực tế. Không xóa các MCP server entries khác đã có.

## Files
| Action | Path |
|--------|------|
| MODIFY | `<AG_DATA_DIR>/mcp_config.json` |

## Verification
- [ ] MCP config valid JSON
- [ ] `ping` tool có `background: "always"`
- [ ] Server khởi động bình thường qua MCP

## Done Criteria
- [ ] Config đúng format
- [ ] `ping` tool không block conversation khi gọi
