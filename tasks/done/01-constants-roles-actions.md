# Task 01: Constants — Thêm WORKER_ROLE, AGENT_ACTION

## Info
- **ID:** 01-constants-roles-actions
- **Module:** constants
- **Group:** 1 (Foundation)
- **Dependencies:** none
- **Priority:** 1

## What to do

Bổ sung constants mới vào `src/constants.mjs`:

### 1. WORKER_ROLE enum
```js
export const WORKER_ROLE = {
  PLANNER: 'PLANNER',
  WORKER: 'WORKER',
  IDLE: 'IDLE'
};
```

### 2. AGENT_ACTION enum (directive responses)
```js
export const AGENT_ACTION = {
  EXECUTE: 'EXECUTE',           // Có task → agent execute
  IDLE: 'IDLE',                 // Không có gì → agent idle
  BECOME_PLANNER: 'BECOME_PLANNER',  // Có plan mới → promote to planner
  DECOMPOSE: 'DECOMPOSE',      // Plan sẵn sàng → decompose
  WAIT: 'WAIT'                  // Đang bận → chờ
};
```

### 3. POLL_DEFAULTS
```js
export const POLL_DEFAULTS = {
  POLL_TIMEOUT_MS: 30_000,      // Long poll default 30s
  CHECK_INTERVAL_MS: 2_000,     // Internal check every 2s
  PLAN_POLL_TIMEOUT_MS: 60_000  // Plan poll default 60s
};
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/constants.mjs` |

## Verification
- `node -e "import('./src/constants.mjs').then(m => console.log(m.WORKER_ROLE, m.AGENT_ACTION, m.POLL_DEFAULTS))"`
- Tất cả 3 objects phải in ra đúng values

## Done Criteria
- [x] `WORKER_ROLE` export có 3 values
- [x] `AGENT_ACTION` export có 5 values
- [x] `POLL_DEFAULTS` export có 3 values
- [x] Không break existing imports
