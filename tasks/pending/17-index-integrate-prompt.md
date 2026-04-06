# Task 17: index.mjs — Integrate promptConfig → startServer

## Info
- **ID:** 17-index-integrate-prompt
- **Module:** entry point
- **Group:** 8
- **Dependencies:** 16
- **Priority:** 2

## What to do

Cập nhật `src/index.mjs`: gọi `promptConfig()` trước `startServer()`.
Cập nhật `startServer()` trong `src/mcp-server/index.mjs`: nhận runtime config, truyền xuống subsystems (RecoveryManager, PlanWatcher, tools context).

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/index.mjs` |
| MODIFY | `src/mcp-server/index.mjs` |

## Done Criteria
- [ ] `promptConfig()` chạy trước `startServer()`
- [ ] Runtime config truyền đúng xuống subsystems
- [ ] RecoveryManager dùng config staleThresholdMs
- [ ] Long Poll tools dùng config pollTimeoutMs
