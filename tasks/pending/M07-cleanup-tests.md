# Task M07: Cleanup Root Scripts & Migrate Tests

## Info
- **ID:** M07-cleanup-tests
- **Module:** root scripts, tests/
- **Group:** 3 (Cleanup)
- **Dependencies:** M06
- **Priority:** 7
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 6

## What to do

### 1. [DELETE] Root test scripts

Xoá 3 file root scripts (tính năng đã covered bởi `tests/`):

| File | Reason |
|------|--------|
| `test.mjs` | `force_release_task` test → covered by e2e |
| `test-tools.mjs` | Smoke test tool registration → trivial |
| `verify.mjs` | Quick idle-resolver check → covered by e2e |

### 2. [MIGRATE] `tests/*.mjs` → `tests/*.ts`

| From | To | Notes |
|------|-----|-------|
| `tests/e2e-flow.mjs` | `tests/e2e-flow.ts` | HTTP fetch types, response types |
| `tests/test-check-plans.mjs` | `tests/test-check-plans.ts` | MCP SDK client types |
| `tests/test-visual-queue.mjs` | `tests/test-visual-queue.ts` | Fix import path: `./src/` → `../src/` |

### 3. Import path fixes

Trong test files, sửa:
```diff
- import { X } from '../src/something.mjs'
+ import { X } from '../src/something.js'
```

> **Note:** `test-visual-queue.mjs` có bug import sai path (`./src/` thay vì `../src/`). Fix luôn trong migration.

## Files
| Action | Path |
|--------|------|
| DELETE | `test.mjs` |
| DELETE | `test-tools.mjs` |
| DELETE | `verify.mjs` |
| RENAME + MODIFY | `tests/e2e-flow.mjs` → `.ts` |
| RENAME + MODIFY | `tests/test-check-plans.mjs` → `.ts` |
| RENAME + MODIFY | `tests/test-visual-queue.mjs` → `.ts` |

## Verification
```bash
# Root scripts gone
ls test.mjs test-tools.mjs verify.mjs 2>&1
# Expected: No such file or directory

# Test files migrated
ls tests/*.ts
# Expected: 3 .ts files

# Type check tests (separate tsconfig or tsx)
npx tsx tests/e2e-flow.ts
# Expected: Tests pass (server phải chạy)
```

## Done Criteria
- [ ] 3 root scripts đã xoá
- [ ] 3 test files đã migrate sang `.ts`
- [ ] Import paths đúng (`.js`, đúng relative path)
- [ ] Test files chạy được với `npx tsx`
