# Task PQ02: Cập nhật consumers sử dụng threshold mới

## Info
- **ID:** PQ02-update-consumers-new-threshold
- **Module:** recovery, idle-resolver, tools, startup-prompt
- **Group:** 1 (Server — Consumers)
- **Dependencies:** PQ01
- **Priority:** 2
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md`

## What to do

### Goal
Cập nhật 4 files consumer đang reference `staleThresholdMs` sang sử dụng `staleWorkerThresholdMs` (cho worker recovery) hoặc `plannerAliveThresholdMs` (cho planner election).

### 1. `src/mcp-server/recovery.mjs` — Worker recovery dùng `staleWorkerThresholdMs`

```diff
-  this.staleThresholdMs = recoveryConfig.staleThresholdMs ?? RECOVERY_DEFAULTS.STALE_THRESHOLD_MS;
+  this.staleThresholdMs = recoveryConfig.staleWorkerThresholdMs ?? config.recovery?.staleWorkerThresholdMs ?? RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS;
```

> **Lưu ý**: Giữ nguyên internal property name `this.staleThresholdMs` nếu nó được dùng ở nhiều chỗ trong file. Chỉ đổi **source value** nó nhận từ config.

### 2. `src/mcp-server/idle-resolver.mjs` — Planner check dùng `plannerAliveThresholdMs`

```diff
-  const activePlanner = workerRegistry.getActivePlanner(config.recovery.staleThresholdMs);
+  const activePlanner = workerRegistry.getActivePlanner(config.recovery.plannerAliveThresholdMs);
```

### 3. `src/mcp-server/tools.mjs` (`register_worker`) — Planner election dùng `plannerAliveThresholdMs`

```diff
-  const { staleThresholdMs } = context.config.recovery;
+  const { plannerAliveThresholdMs } = context.config.recovery;
   ...
-  const activePlanner = workerRegistry.getActivePlanner(staleThresholdMs);
+  const activePlanner = workerRegistry.getActivePlanner(plannerAliveThresholdMs);
```

### 4. `src/utils/startup-prompt.mjs` — Update key reference nếu có

Tìm mọi reference đến `staleThresholdMs` và đổi sang key phù hợp. Nếu file hiển thị config cho user, cập nhật label/key tương ứng.

## Constraints
- Đọc kỹ từng file trước khi sửa — tìm TẤT CẢ references đến `staleThresholdMs`, không chỉ diff ở trên
- Không thay đổi logic — chỉ đổi key/source value

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/recovery.mjs` |
| MODIFY | `src/mcp-server/idle-resolver.mjs` |
| MODIFY | `src/mcp-server/tools.mjs` |
| MODIFY | `src/utils/startup-prompt.mjs` |

## Verification
```bash
# Không còn reference nào đến staleThresholdMs (trừ comment giải thích nếu có)
grep -rn "staleThresholdMs" src/ --include="*.mjs" | grep -v "// " | grep -v "TODO"

# Server start không lỗi
node -e "import('./src/config.mjs').then(m => { const c = m.createConfig({}); console.log('recovery:', JSON.stringify(c.recovery)); })"
```

## Done Criteria
- [x] `recovery.mjs` đọc `staleWorkerThresholdMs` từ config
- [x] `idle-resolver.mjs` gọi `getActivePlanner()` với `plannerAliveThresholdMs`
- [x] `tools.mjs` gọi `getActivePlanner()` với `plannerAliveThresholdMs`
- [x] `startup-prompt.mjs` không còn reference key cũ
- [x] `grep -rn "staleThresholdMs" src/` trả về 0 kết quả (trừ comment)
- [x] Server start không error
