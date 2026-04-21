# Task M06: Migrate Layer 4 — Top-level Wiring

## Info
- **ID:** M06-migrate-layer4-toplevel
- **Module:** mcp-server (server, tools, transport, index), src/index
- **Group:** 2 (File Migration)
- **Dependencies:** M05
- **Priority:** 6
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 3, Layer 4

## What to do

Migrate 5 top-level files. Đây là layer cuối — sau task này TOÀN BỘ `src/` là `.ts`.

### 1. `mcp-server/server.mjs` → `server.ts` (Low)
- MCP SDK types (McpServer)
- Export factory function typed

### 2. `mcp-server/tools.mjs` → `tools.ts` ⭐ (High — 698 LOC)
- **File lớn nhất!** Cần cẩn thận.
- Tool input parameter types (Zod schemas đã có, chỉ cần annotate)
- Tool handler return types → `ToolResponse`
- `ServerContext` param cho `registerTools()`
- Không cần refactor — chỉ thêm types

### 3. `mcp-server/transport.mjs` → `transport.ts` (Low)
- Express `Request`, `Response` types
- Import `@types/express`

### 4. `mcp-server/index.mjs` → `mcp-server/index.ts` (154 LOC, Low)
- Express `Application` type
- `startServer()` function signature
- Wire all deps with proper types

### 5. `src/index.mjs` → `src/index.ts` (Low)
- Entry point
- CLI arg parsing types
- Import `startServer` từ `./mcp-server/index.js`

## Files
| Action | Path |
|--------|------|
| RENAME + MODIFY | `src/mcp-server/server.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/tools.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/transport.mjs` → `.ts` |
| RENAME + MODIFY | `src/mcp-server/index.mjs` → `.ts` |
| RENAME + MODIFY | `src/index.mjs` → `.ts` |

## Verification
```bash
# Full typecheck — PHẢI pass 0 errors
npx tsc --noEmit

# Dev mode chạy được
npx tsx src/index.ts serve --port 3848
# Expected: Server starts on port 3848
# Ctrl+C to stop
```

## Done Criteria
- [x] 5 files đã rename sang `.ts`
- [x] `tools.ts` — tất cả tool handlers typed
- [x] `transport.ts` — Express types đúng
- [x] `npx tsc --noEmit` → **0 errors**
- [x] `npx tsx src/index.ts serve` chạy thành công
- [x] Không thay đổi logic runtime
