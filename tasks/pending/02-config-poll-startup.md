# Task 02: Config — Thêm pollTimeout, startup config schema

## Info
- **ID:** 02-config-poll-startup
- **Module:** config
- **Group:** 1 (Foundation)
- **Dependencies:** none
- **Priority:** 1

## What to do

Mở rộng `src/config.mjs` để hỗ trợ runtime config từ interactive prompt.

### 1. Thêm fields vào `loadConfig()` return
```js
return {
  // ... existing fields ...
  polling: {
    pollTimeoutMs: overrides.pollTimeoutMs || POLL_DEFAULTS.POLL_TIMEOUT_MS,
    checkIntervalMs: overrides.checkIntervalMs || POLL_DEFAULTS.CHECK_INTERVAL_MS,
    planPollTimeoutMs: overrides.planPollTimeoutMs || POLL_DEFAULTS.PLAN_POLL_TIMEOUT_MS,
  },
  recovery: {
    staleThresholdMs: overrides.staleThresholdMs || RECOVERY_DEFAULTS.STALE_THRESHOLD_MS,
  }
};
```

### 2. Import constants cần thiết
```js
import { POLL_DEFAULTS, RECOVERY_DEFAULTS } from './constants.mjs';
```

### 3. Đảm bảo overrides propagate
`loadConfig(overrides)` phải merge tất cả runtime values từ `promptConfig()`.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/config.mjs` |

## Verification
- `node -e "import('./src/config.mjs').then(m => { const c = m.loadConfig({pollTimeoutMs: 5000}); console.log(c.polling) })"`
- Phải in ra `{ pollTimeoutMs: 5000, checkIntervalMs: 2000, planPollTimeoutMs: 60000 }`

## Done Criteria
- [ ] `config.polling` object có 3 fields
- [ ] `config.recovery` object có staleThresholdMs
- [ ] Overrides hoạt động đúng
- [ ] Existing code không bị break
