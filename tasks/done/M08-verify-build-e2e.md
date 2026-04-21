# Task M08: Full Verification & Build

## Info
- **ID:** M08-verify-build-e2e
- **Module:** entire project
- **Group:** 4 (Verification)
- **Dependencies:** M07
- **Priority:** 8
- **Ref:** `dev-docs/migrate-to-typescript.md` — Section 6

## What to do

Chạy full verification pipeline. Nếu có lỗi → fix trước khi đánh done.

### Step 1: Type check
```bash
npm run typecheck
# Expected: 0 errors
```

### Step 2: Build
```bash
npm run build
# Expected: dist/ populated with .js + .d.ts + .js.map
```

Verify dist structure:
```bash
ls -la dist/
ls -la dist/mcp-server/
ls -la dist/utils/
```

### Step 3: Server start (production mode)
```bash
npm run serve
# Expected: "MCP Server listening :3847" hoặc tương tự
# Ctrl+C to stop
```

### Step 4: Server start (dev mode)
```bash
npm run dev
# Expected: Server starts, chạy via tsx
# Ctrl+C to stop
```

### Step 5: Health check
```bash
curl http://127.0.0.1:3847/health
# Expected: JSON response with status "ok"
```

### Step 6: E2E test
```bash
npx tsx tests/e2e-flow.ts
# Expected: "ALL PASSED" hoặc tương đương
```

### Step 7: Verify no `.mjs` left in src/
```bash
find src/ -name "*.mjs"
# Expected: empty (0 results)
```

### Step 8: Update `dev-docs/migrate-to-typescript.md`
- Đổi Status: `Approved — sẵn sàng implement` → `✅ Done`
- Thêm completion date

## Files
| Action | Path |
|--------|------|
| VERIFY | Entire `src/` directory |
| VERIFY | `dist/` output |
| MODIFY | `dev-docs/migrate-to-typescript.md` (status update) |

## Verification
Tất cả 7 steps ở trên phải pass.

## Done Criteria
- [x] `npm run typecheck` → 0 errors
- [x] `npm run build` → `dist/` populated
- [x] `npm run serve` → server starts từ `dist/`
- [x] `npm run dev` → server starts từ tsx
- [x] E2E test passes
- [x] Không còn `.mjs` file nào trong `src/`
- [x] `dev-docs/migrate-to-typescript.md` status = Done
