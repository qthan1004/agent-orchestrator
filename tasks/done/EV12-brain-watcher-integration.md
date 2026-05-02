# Task EV12: Brain Watcher Integration & npm Script

## Info
- **ID:** EV12-brain-watcher-integration
- **Module:** project config + src/agents/antigravity/
- **Group:** 3 (Brain Watcher)
- **Dependencies:** EV10, EV11
- **Priority:** 12
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 3, §3.3

## What to do

Integrate brain watcher vào orchestrator ecosystem:
1. npm script để chạy standalone
2. Optional: import từ orchestrator server

### [MODIFY] `package.json`

```diff
  "scripts": {
+   "watch:ag": "npx tsx src/agents/antigravity/brain-watcher.ts",
    ...
  }
```

### Optional: Import vào orchestrator

Nếu muốn chạy cùng MCP server (không bắt buộc Phase 3):

```typescript
// src/mcp-server/index.ts
import { startBrainWatcher } from '../agents/antigravity/brain-watcher.js';

// Start brain watcher alongside MCP server
if (process.env.AG_BRAIN_WATCHER !== 'false') {
  startBrainWatcher();
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `package.json` — thêm script `watch:ag` |
| MODIFY | `src/agents/antigravity/brain-watcher.ts` — export `startBrainWatcher()` |
| OPTIONAL | `src/mcp-server/index.ts` — import brain watcher |

## Verification
```bash
# Standalone mode
npm run watch:ag
# Expected: "Brain watcher started, polling every 10s..."

# Integrated mode (nếu implement)
npm run serve
# Expected: Server + brain watcher cùng chạy
```

## Done Criteria
- [ ] `npm run watch:ag` khởi động brain watcher
- [ ] Brain watcher chạy stable, không crash khi brain dir trống
- [ ] Graceful shutdown (SIGINT/SIGTERM)
