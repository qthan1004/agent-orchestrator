# Task 03: WorkerRegistry — Thêm role field + getActivePlanner

## Info
- **ID:** 03-worker-registry-roles
- **Module:** utils
- **Group:** 2 (Role Manager)
- **Dependencies:** 01
- **Priority:** 1

## What to do

Refactor `src/utils/worker-registry.mjs` để hỗ trợ role management và single planner enforcement.

### 1. Thêm `role` field vào worker info
```js
register() {
  const workerInfo = {
    id,
    role: null,  // ← NEW: WORKER_ROLE enum value
    registered_at, last_heartbeat, current_task, tasks_completed, status
  };
}
```

### 2. Thêm method `setRole(workerId, role)`
```js
setRole(workerId, role) {
  const w = this.workers.get(workerId);
  if (w) { w.role = role; this._save(); return true; }
  return false;
}
```

### 3. Thêm method `getActivePlanner(staleThresholdMs)`
```js
getActivePlanner(staleThresholdMs) {
  const now = Date.now();
  for (const w of this.workers.values()) {
    if (w.role === WORKER_ROLE.PLANNER) {
      const elapsed = now - new Date(w.last_heartbeat).getTime();
      if (elapsed < staleThresholdMs) return w; // alive planner
    }
  }
  return null; // no active planner
}
```

### 4. Import WORKER_ROLE từ constants
```js
import { WORKER_STATUS, WORKER_ROLE } from '../constants.mjs';
```

### 5. Lưu ý: WorkerRegistry là singleton
- `staleThresholdMs` truyền qua method parameter (không inject vào constructor)
- Giữ backward compatibility — existing code không break

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/utils/worker-registry.mjs` |

## Verification
```bash
node -e "
import { workerRegistry } from './src/utils/worker-registry.mjs';
import { WORKER_ROLE } from './src/constants.mjs';
const w = workerRegistry.register();
workerRegistry.setRole(w.id, WORKER_ROLE.PLANNER);
const planner = workerRegistry.getActivePlanner(1800000);
console.log('role:', w.role, 'planner:', planner?.id === w.id);
"
```
- Expected: `role: PLANNER planner: true`

## Done Criteria
- [x] `register()` trả worker có `role: null`
- [x] `setRole()` update role + persist
- [x] `getActivePlanner()` tìm planner alive
- [x] `getActivePlanner()` return null nếu planner stale
- [x] Existing code không break
