# Task EV10: Brain Watcher Service (AG-specific)

## Info
- **ID:** EV10-brain-watcher-service
- **Module:** src/agents/antigravity/
- **Group:** 3 (Brain Watcher)
- **Dependencies:** EV08
- **Priority:** 10
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 3, §3.1

## What to do

Tạo brain watcher service — background process theo dõi `.pb` files trong AG conversations directory để detect stuck sessions.

### [NEW] `src/agents/antigravity/brain-watcher.ts`

> Migration M01-M08 đã hoàn thành — dùng TypeScript.

**Logic (State Machine):**

```
1. Resolve AG data dir:
   Windows: %USERPROFILE%\.gemini\antigravity\brain\
   Linux:   ~/.gemini/antigravity/brain/

2. Poll conversations/*.pb every 10s (fs.statSync, lấy file size)

3. Track per-conversation state:
   Map<uuid, {
     lastSize: number,
     lastChangeAt: Date,
     status: 'ACTIVE' | 'IDLE' | 'STUCK'
   }>

4. Status transitions:
   - size changed → ACTIVE (reset timer)
   - no change 60s → IDLE
   - no change 3 min → STUCK

5. On STUCK:
   → Write brain/{uuid}/.stuck-signal.json
   → Desktop notification (see EV11)
   → Optional: write exchange/signals/ag-stuck.json for orchestrator
```

**Config:**

```typescript
const BRAIN_WATCHER_CONFIG = {
  POLL_INTERVAL_MS: 10_000,      // 10s
  IDLE_THRESHOLD_MS: 60_000,     // 1 min
  STUCK_THRESHOLD_MS: 180_000,   // 3 min
} as const;
```

### [NEW] `src/agents/antigravity/config-resolver.ts`

Helper to resolve AG data dir paths cross-platform:

```typescript
function resolveAgDataDir(): string {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), '.gemini', 'antigravity');
  }
  return path.join(os.homedir(), '.gemini', 'antigravity');
}

function resolveBrainDir(): string {
  return path.join(resolveAgDataDir(), 'brain');
}
```

## Files
| Action | Path |
|--------|------|
| NEW    | `src/agents/antigravity/brain-watcher.ts` |
| NEW    | `src/agents/antigravity/config-resolver.ts` |

## Verification
```bash
# Start brain watcher (use tsx for TypeScript)
npx tsx src/agents/antigravity/brain-watcher.ts

# Open AG conversation → watcher logs ACTIVE
# Wait 1 min idle → watcher logs IDLE
# Wait 3 min idle → watcher logs STUCK
# .stuck-signal.json created
```

## Done Criteria
- [ ] `src/agents/antigravity/` directory tồn tại
- [ ] Brain watcher poll .pb files mỗi 10s
- [ ] State transitions: ACTIVE → IDLE → STUCK đúng thresholds
- [ ] .stuck-signal.json written khi STUCK
- [ ] Cross-platform path resolution (Windows + Linux)
- [ ] Standalone process chạy được (`npx tsx src/agents/antigravity/brain-watcher.ts`)
