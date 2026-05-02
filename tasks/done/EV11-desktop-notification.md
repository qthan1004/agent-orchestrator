# Task EV11: Desktop Notification for Stuck Detection

## Info
- **ID:** EV11-desktop-notification
- **Module:** src/agents/antigravity/
- **Group:** 3 (Brain Watcher)
- **Dependencies:** EV10
- **Priority:** 11
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 3, §3.2

## What to do

Thêm desktop notification khi brain watcher detect STUCK session.

### [NEW] `src/agents/antigravity/notifications.ts`

> Migration M01-M08 đã hoàn thành — dùng TypeScript.

**Cross-platform notification:**

```typescript
import notifier from 'node-notifier';

export function notifyStuck(uuid: string, duration: string) {
  notifier.notify({
    title: 'AG Session Stuck',
    message: `Session ${uuid.slice(0,8)} no activity for ${duration}`,
    actions: ['Open AG', 'Dismiss'],
    wait: true,
  });
}

export function notifyRecoveryReady(sessionData: object) {
  notifier.notify({
    title: 'AG Ready to Resume',
    message: 'Resume prompt copied to clipboard. Open new AG chat and paste.',
    wait: true,
  });
}
```

### [MODIFY] `package.json`

**Thêm dependency:**

```diff
  "dependencies": {
+   "node-notifier": "^10.0.0",
    ...
  }
```

### Integration

Gọi `notifyStuck()` từ brain watcher khi status chuyển sang STUCK.

## Files
| Action | Path |
|--------|------|
| NEW    | `src/agents/antigravity/notifications.ts` |
| MODIFY | `package.json` — thêm `node-notifier` + `@types/node-notifier` |
| MODIFY | `src/agents/antigravity/brain-watcher.ts` — import + call |

## Verification
```bash
# Trigger STUCK → desktop notification xuất hiện
# Windows: toast notification
# Linux: libnotify notification
```

## Done Criteria
- [ ] `node-notifier` installed
- [ ] `notifications.mjs` export `notifyStuck` và `notifyRecoveryReady`
- [ ] Brain watcher gọi notification khi STUCK
- [ ] Notification hiển thị trên desktop (Windows tested)
