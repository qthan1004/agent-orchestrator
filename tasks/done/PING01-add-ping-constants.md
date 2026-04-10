# Task 01: Constants — Thêm PING vào TOOL_NAMES

## Info
- **ID:** PING01-add-ping-constants
- **Module:** constants
- **Group:** 1 (Foundation)
- **Dependencies:** none
- **Priority:** 1

## What to do

Bổ sung tool endpoint name mới vào `src/constants.mjs`:

### 1. TOOL_NAMES enum
```js
export const TOOL_NAMES = {
  // các tool hiện có
  GET_NEXT_TASK: "get_next_task",
  SUBMIT_DECOMPOSITION: "submit_decomposition",
  // ...
  PING: "ping"
};
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/constants.mjs` |

## Verification
- Kiểm tra syntax: `node -c src/constants.mjs`
- Test log ra giá trị để check: `node -e "import('./src/constants.mjs').then(m => console.log(m.TOOL_NAMES.PING))"`

## Done Criteria
- [x] `TOOL_NAMES.PING` tồn tại
- [x] Giá trị bằng `'ping'`
- [x] Không break existing imports
