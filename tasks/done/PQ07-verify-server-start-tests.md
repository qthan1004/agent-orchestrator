# Task PQ07: Verify — Server start + Tests pass

## Info
- **ID:** PQ07-verify-server-start-tests
- **Module:** all
- **Group:** 3 (Verification)
- **Dependencies:** PQ01, PQ02, PQ03, PQ04, PQ05, PQ06
- **Priority:** 7
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md` → "Verification Plan"

## What to do

### Goal
Chạy toàn bộ verification suite để đảm bảo tất cả thay đổi server + prompt không break hệ thống.

### Steps

1. **Grep check** — Không còn reference cũ `STALE_THRESHOLD_MS` hoặc `staleThresholdMs` trong src/
   ```bash
   grep -rn "STALE_THRESHOLD_MS\b" src/ --include="*.mjs"
   grep -rn "staleThresholdMs" src/ --include="*.mjs"
   ```
   Expected: 0 kết quả (trừ comments)

2. **Config check** — New config keys đúng giá trị
   ```bash
   node -e "import('./src/config.mjs').then(m => { const c = m.createConfig({}); console.log(JSON.stringify(c.recovery, null, 2)); })"
   ```

3. **Existing tests** — Tất cả pass
   ```bash
   node test.mjs
   ```

4. **Server start** — Không error
   ```bash
   timeout 5 node src/index.mjs 2>&1 || true
   ```

5. **Prompt completeness** — Tất cả sections mới có trong file
   ```bash
   echo "=== Planner Steps ==="
   grep -c "Step 3[A-E]" prompts/agent-prompt.md
   echo "=== Worker Protocol ==="
   grep -c "Pre-flight\|Self-Validation\|CRITICAL" prompts/agent-prompt.md
   echo "=== New Rules ==="
   grep -cE "^(7|8|9|10|11|12)\." prompts/agent-prompt.md
   echo "=== Appendices ==="
   grep -c "Appendix [AB]" prompts/agent-prompt.md
   ```

## Files
Không modify — chỉ verify

## Verification
Tất cả commands ở trên phải pass.

## Done Criteria
- [x] Không còn `STALE_THRESHOLD_MS` (old constant) trong src/
- [x] Không còn `staleThresholdMs` (old config key) trong src/
- [x] `config.recovery` có `staleWorkerThresholdMs` = 90000 và `plannerAliveThresholdMs` = 45000
- [x] `node test.mjs` pass
- [x] Server start không throw error
- [x] 5 planner sub-steps (3A-3E) có trong prompt
- [x] Worker protocol (Pre-flight, Self-Validation) có trong prompt
- [x] 6 rules mới (7-12) có trong prompt
- [x] 2 appendices (A, B) có trong prompt
