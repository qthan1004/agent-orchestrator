# Task PQ01: Tách STALE_THRESHOLD_MS → 2 constants riêng biệt

## Info
- **ID:** PQ01-split-stale-threshold-constants
- **Module:** constants, config
- **Group:** 1 (Server — Foundation)
- **Dependencies:** none
- **Priority:** 1
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md`

## What to do

### Goal
Tách `STALE_THRESHOLD_MS` (hiện tại 30s dùng chung cho cả worker recovery và planner election) thành 2 constants riêng biệt với giá trị phù hợp từng mục đích.

### 1. `src/constants.mjs` — Sửa `RECOVERY_DEFAULTS`

```diff
 export const RECOVERY_DEFAULTS = {
   MONITOR_INTERVAL_MS: 5_000,
-  STALE_THRESHOLD_MS: 30_000,
+  STALE_WORKER_THRESHOLD_MS: 90_000,   // 90s — worker task stuck detection
+  PLANNER_ALIVE_THRESHOLD_MS: 45_000,  // 45s — planner heartbeat check
   MAX_RETRIES: 3,
   MAX_TASK_RETRIES: 3
 };
```

### 2. `src/config.mjs` — Update config keys

```diff
 recovery: {
-  staleThresholdMs: overrides.staleThresholdMs || RECOVERY_DEFAULTS.STALE_THRESHOLD_MS,
+  staleWorkerThresholdMs: overrides.staleWorkerThresholdMs || RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS,
+  plannerAliveThresholdMs: overrides.plannerAliveThresholdMs || RECOVERY_DEFAULTS.PLANNER_ALIVE_THRESHOLD_MS,
   maxTaskRetries: overrides.maxTaskRetries || RECOVERY_DEFAULTS.MAX_TASK_RETRIES,
 }
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/constants.mjs` |
| MODIFY | `src/config.mjs` |

## Verification
```bash
node -e "import('./src/constants.mjs').then(m => { const r = m.RECOVERY_DEFAULTS; console.log('STALE_WORKER_THRESHOLD_MS:', r.STALE_WORKER_THRESHOLD_MS); console.log('PLANNER_ALIVE_THRESHOLD_MS:', r.PLANNER_ALIVE_THRESHOLD_MS); console.assert(!r.STALE_THRESHOLD_MS, 'Old key should not exist'); console.log('OK'); })"
```

## Done Criteria
- [x] `RECOVERY_DEFAULTS.STALE_THRESHOLD_MS` không còn tồn tại
- [x] `RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS` = 90000
- [x] `RECOVERY_DEFAULTS.PLANNER_ALIVE_THRESHOLD_MS` = 45000
- [x] `config.recovery.staleWorkerThresholdMs` đọc đúng từ overrides hoặc default
- [x] `config.recovery.plannerAliveThresholdMs` đọc đúng từ overrides hoặc default
- [x] Không break existing `MAX_RETRIES`, `MAX_TASK_RETRIES`, `MONITOR_INTERVAL_MS`
