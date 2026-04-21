# Migrate Agent Orchestrator: `.mjs` → TypeScript

> **Status**: ✅ Done  
> **Completed**: 2026-04-21  
> **Scope**: Chuyển toàn bộ `src/**/*.mjs` + test files sang `.ts`  
> **Risk**: Low — codebase nhỏ (~18 files), chưa có external consumers  

---

## 1. Tổng quan hiện trạng

| Metric | Value |
|---|---|
| **Total `.mjs` files** | 21 (15 src + 3 root scripts + 3 tests) |
| **Total LOC** | ~3,300 lines |
| **Dependencies** | `@modelcontextprotocol/sdk`, `express`, `zod` |
| **Module system** | ESM (`"type": "module"` in package.json) |
| **Runtime** | Node.js (no bundler) |

### File inventory

```
src/                                   ← 15 files, core logic
├── index.mjs                (28 LOC)  — Entry point
├── config.mjs               (52 LOC)  — Config loader
├── constants.mjs           (135 LOC)  — All constants (incl. VERSION, PLANNER_ALIVE_THRESHOLD_MS)
├── mcp-server/
│   ├── index.mjs           (154 LOC)  — Server bootstrap
│   ├── server.mjs           (12 LOC)  — MCP server factory
│   ├── tools.mjs           (698 LOC)  — Tool registrations (get_template, ping) ⭐
│   ├── transport.mjs        (63 LOC)  — Streamable HTTP
│   ├── state-manager.mjs   (415 LOC)  — State machine (requeueWithRetry)
│   ├── task-queue.mjs      (194 LOC)  — DAG-based queue
│   ├── recovery.mjs        (353 LOC)  — Crash recovery
│   ├── plan-watcher.mjs    (132 LOC)  — Auto-poll plans
│   ├── poll-helpers.mjs     (78 LOC)  — Long polling
│   └── idle-resolver.mjs    (36 LOC)  — Idle resolver
└── utils/
    ├── file-backend.mjs    (137 LOC)  — File I/O
    ├── logger.mjs           (55 LOC)  — Daily logs
    ├── bootstrap.mjs        (71 LOC)  — Dir bootstrapper
    ├── worker-registry.mjs (147 LOC)  — Worker registry (roles, heartbeat, planner tracking)
    └── startup-prompt.mjs   (64 LOC)  — Interactive prompt

Root scripts (sẽ xử lý):       ← 3 files
├── test.mjs                 (72 LOC)  — Unit test force_release
├── test-tools.mjs           (15 LOC)  — Smoke test tool registration
├── verify.mjs               (15 LOC)  — Quick verify idle-resolver

tests/                                 ← 3 files, integration
├── e2e-flow.mjs            (235 LOC)  — Full E2E via HTTP
├── test-check-plans.mjs     (64 LOC)  — Plan lifecycle test
└── test-visual-queue.mjs    (96 LOC)  — Visual queue test
```

---

## 2. Decisions (Confirmed)

| Question | Decision |
|---|---|
| **Dev runtime** | `tsx` cho dev (chạy `.ts` trực tiếp), `tsc` + `node` cho production |
| **Strict mode** | `"strict": true` ngay từ đầu |
| **Root test files** | `test.mjs`, `test-tools.mjs`, `verify.mjs` → **DELETE** (tính năng đã cover bởi `tests/`) |
| **Test files in tests/** | Migrate sang `.ts`, giữ nguyên |
| **File extension** | `.ts` (không phải `.mts`) |

---

## 3. Migration Strategy

### Approach: **In-place rename + type layer**

> Không refactor logic — chỉ thêm types và đổi extension.

1. Setup TypeScript infra (`tsconfig.json`, deps)
2. Tạo `src/models/` — shared interfaces
3. Rename `.mjs` → `.ts` theo thứ tự dependency (bottom-up)
4. Fix imports: `.mjs` → `.js` (Node16 module resolution)
5. Thêm `as const` cho constant objects
6. Delete root test scripts
7. Migrate `tests/*.mjs` → `tests/*.ts`
8. Verify: typecheck → build → run → test

### Tại sao `.ts` không phải `.mts`?

- `.mts` → `.mjs` output — ít tooling support
- `"type": "module"` trong `package.json` → `.ts` → `.js` ESM hoàn toàn OK
- Ecosystem support tốt hơn

---

## 4. Proposed Changes

### Phase 1: TypeScript Infrastructure

#### [NEW] `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests", "exchange", "plan", "tasks"]
}
```

#### [MODIFY] `package.json`

```diff
 {
   "name": "agent-orchestrator",
-  "version": "0.1.0",
+  "version": "0.2.0",
   "private": true,
   "type": "module",
   "scripts": {
-    "serve": "node src/index.mjs serve"
+    "dev": "tsx src/index.ts serve",
+    "build": "tsc",
+    "serve": "node dist/index.js serve",
+    "typecheck": "tsc --noEmit"
   },
   "dependencies": {
     "@modelcontextprotocol/sdk": "^1.29.0",
     "express": "^5.2.1",
     "zod": "^4.3.6"
   },
+  "devDependencies": {
+    "typescript": "^5.8.0",
+    "tsx": "^4.19.0",
+    "@types/node": "^22.0.0",
+    "@types/express": "^5.0.0"
+  }
 }
```

> **`tsx`** — CLI runner chạy `.ts` trực tiếp (dựa trên esbuild), KHÔNG phải `.tsx` file extension.

#### [MODIFY] `.gitignore`

```diff
+ dist/
+ *.js.map
+ *.d.ts
```

**Dev workflow sau migration:**
```bash
# Development (chạy .ts trực tiếp, không cần build)
npm run dev

# Production build + run
npm run build && npm run serve

# Type check only (CI)
npm run typecheck
```

---

### Phase 2: Type Definitions

#### [NEW] `src/models/`

File trung tâm chứa tất cả shared interfaces:

```typescript
// ─── Worker ──────────────────────────────────────
export interface WorkerInfo {
  id: string;
  role: string | null;
  registered_at: string;
  last_heartbeat: string;
  current_task: string | null;
  tasks_completed: number;
  status: string;
  disconnected_at?: string;
}

// ─── Task ────────────────────────────────────────
export interface TaskDef {
  id: string;
  module: string;
  action: string;
  verification: string;
  status?: string;
}

export interface TaskResult {
  task_id: string;
  status: string;
  summary: string;
  worker_id: string;
  completed_at: string;
}

export interface TaskGroup {
  group_id: number;
  tasks: string[];
  depends_on?: number[];
}

export interface TaskGraph {
  groups: TaskGroup[];
}

// ─── Config ──────────────────────────────────────
export interface ExchangeConfig {
  base: string;
  inbox: string;
  active: string;
  outbox: string;
  checkpoints: string;
  logs: string;
}

export interface DirConfig {
  base: string;
  pending: string;
  processing: string;
  done: string;
}

export interface AppConfig {
  root: string;
  exchange: ExchangeConfig;
  templates: string;
  plans: DirConfig;
  tasks: DirConfig;
  server: { port: number; host: string };
  planWatcher: { intervalMs: number };
  polling: {
    pollTimeoutMs: number;
    checkIntervalMs: number;
    planPollTimeoutMs: number;
  };
  recovery: {
    staleThresholdMs: number;
    plannerAliveThresholdMs: number;
    maxTaskRetries: number;
  };
}

export interface ConfigOverrides {
  root?: string;
  port?: number;
  host?: string;
  planWatcherIntervalMs?: number;
  pollTimeoutMs?: number;
  checkIntervalMs?: number;
  planPollTimeoutMs?: number;
  staleThresholdMs?: number;
  plannerAliveThresholdMs?: number;
  maxTaskRetries?: number;
}

// ─── Plan ────────────────────────────────────────
export interface PlanCheckResult {
  status: 'ready' | 'busy' | 'idle';
  current: string | null;
  plan_path?: string;
  content?: string | null;
  pending_count: number;
}

export interface PlanQuickStatus {
  hasPending: boolean;
  hasProcessing: boolean;
  pendingCount: number;
  processingCount: number;
}

// ─── Context ─────────────────────────────────────
export interface ServerContext {
  stateManager: import('./mcp-server/state-manager.js').StateManager;
  logger: import('./utils/logger.js').Logger;
  config: AppConfig;
  recoveryManager?: import('./mcp-server/recovery.js').RecoveryManager;
  planWatcher?: import('./mcp-server/plan-watcher.js').PlanWatcher;
}

// ─── MCP Response ────────────────────────────────
export interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// ─── Bootstrap ───────────────────────────────────
export interface BootstrapResult {
  created: string[];
  failed: string[];
  skipped: number;
}
```

---

### Phase 3: File Migration (bottom-up dependency order)

#### Layer 1 — Leaf modules (no internal deps)

| # | From → To | Effort | Changes |
|---|---|---|---|
| 1 | `constants.mjs` → `constants.ts` | Low | `as const` + type unions |
| 2 | `utils/file-backend.mjs` → `utils/file-backend.ts` | Low | Return types |
| 3 | `utils/logger.mjs` → `utils/logger.ts` | Low | Class types |

#### Layer 2 — Depends on Layer 1

| # | From → To | Effort | Changes |
|---|---|---|---|
| 4 | `config.mjs` → `config.ts` | Low | `AppConfig` return type |
| 5 | `utils/bootstrap.mjs` → `utils/bootstrap.ts` | Low | `AppConfig` param |
| 6 | `utils/worker-registry.mjs` → `utils/worker-registry.ts` | Medium | `Map<string, WorkerInfo>` |
| 7 | `utils/startup-prompt.mjs` → `utils/startup-prompt.ts` | Low | `ConfigOverrides` return |

#### Layer 3 — MCP internals

| # | From → To | Effort | Changes |
|---|---|---|---|
| 8 | `mcp-server/task-queue.mjs` → `task-queue.ts` | Medium | `Map<string, TaskDef>`, `TaskGraph` |
| 9 | `mcp-server/poll-helpers.mjs` → `poll-helpers.ts` | Low | Function sigs |
| 10 | `mcp-server/idle-resolver.mjs` → `idle-resolver.ts` | Low | Params interface |
| 11 | `mcp-server/state-manager.mjs` → `state-manager.ts` | Medium | Class + method types |
| 12 | `mcp-server/recovery.mjs` → `recovery.ts` | Medium | Constructor interface |
| 13 | `mcp-server/plan-watcher.mjs` → `plan-watcher.ts` | Low | Stats interface |

#### Layer 4 — Top-level wiring

| # | From → To | Effort | Changes |
|---|---|---|---|
| 14 | `mcp-server/server.mjs` → `server.ts` | Low | SDK types |
| 15 | `mcp-server/tools.mjs` → `tools.ts` | **High** | Tool param types (~682 LOC) |
| 16 | `mcp-server/transport.mjs` → `transport.ts` | Low | Express types |
| 17 | `mcp-server/index.mjs` → `index.ts` | Low | Express app |
| 18 | `index.mjs` → `index.ts` | Low | Entry point |

---

### Phase 4: Import Path Updates

All imports: `.mjs` → `.js`

```diff
- import { loadConfig } from './config.mjs';
+ import { loadConfig } from './config.js';

- import { TASK_STATUS } from '../constants.mjs';
+ import { TASK_STATUS } from '../constants.js';
```

> Node16 module resolution yêu cầu import extension `.js` — TS compile `.ts` → `.js` nhưng không rewrite paths.

---

### Phase 5: Constants → Const Assertions

```diff
- export const TASK_STATUS = {
-   PENDING: 'pending',
-   ...
- };
+ export const TASK_STATUS = {
+   PENDING: 'pending',
+   ...
+ } as const;
+ export type TaskStatusValue = typeof TASK_STATUS[keyof typeof TASK_STATUS];
```

Áp dụng cho: `VERSION`, `TASK_STATUS`, `WORKER_STATUS`, `WORKER_ROLE`, `AGENT_ACTION`, `STATE_EVENTS`, `RECOVERY_EVENTS`, `TOOL_NAMES`, `DIR_NAMES`, `API_ROUTES`, `FILE_PREFIXES`, `POLL_DEFAULTS`, `RECOVERY_DEFAULTS`, `PROCESS_SIGNALS`, `SHUTDOWN_SIGNALS`, `SHUTDOWN_MARKER_FILE`.

> **Note:** `VERSION` là string literal, chỉ cần `as const`. `RECOVERY_DEFAULTS` giờ có thêm `PLANNER_ALIVE_THRESHOLD_MS` và `MAX_TASK_RETRIES`.

---

### Phase 6: Cleanup

#### [DELETE] Root test scripts (logic đã covered bởi `tests/`)

| File | Reason |
|---|---|
| `test.mjs` | `force_release_task` test → covered by e2e |
| `test-tools.mjs` | Smoke test tool registration → trivial, covered by e2e |
| `verify.mjs` | Quick idle-resolver check → covered by e2e |

#### [MIGRATE] `tests/*.mjs` → `tests/*.ts`

| File | Note |
|---|---|
| `tests/e2e-flow.mjs` → `.ts` | Pure HTTP fetch, minimal typing needed |
| `tests/test-check-plans.mjs` → `.ts` | MCP client test, SDK types available |
| `tests/test-visual-queue.mjs` → `.ts` | Import path fix `./src/` → `../src/` |

> Note: `test-visual-queue.mjs` hiện import sai path (`./src/` thay vì `../src/`). Sẽ fix trong migration.

---

## 5. Cây thư mục sau migration

```
agent-orchestrator/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── constants.ts
│   ├── types.ts                    ← NEW
│   ├── mcp-server/
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── tools.ts
│   │   ├── transport.ts
│   │   ├── state-manager.ts
│   │   ├── task-queue.ts
│   │   ├── recovery.ts
│   │   ├── plan-watcher.ts
│   │   ├── poll-helpers.ts
│   │   └── idle-resolver.ts
│   └── utils/
│       ├── file-backend.ts
│       ├── logger.ts
│       ├── bootstrap.ts
│       ├── worker-registry.ts
│       └── startup-prompt.ts
├── tests/
│   ├── e2e-flow.ts
│   ├── test-check-plans.ts
│   └── test-visual-queue.ts
├── dist/                           ← NEW (gitignored)
├── tsconfig.json                   ← NEW
├── package.json                    ← MODIFIED
├── .gitignore                      ← MODIFIED
├── dev-docs/                       ← This plan
└── ... (exchange/, plan/, tasks/, reference/, prompts/ — unchanged)
```

---

## 6. Verification Plan

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

### Step 3: Server start
```bash
npm run serve
# Expected: "MCP Server listening :3847"
```

### Step 4: Health check
```bash
curl http://127.0.0.1:3847/health
# Expected: JSON response with status "ok"
```

### Step 5: E2E test
```bash
npx tsx tests/e2e-flow.ts
# Expected: "ALL PASSED"
```

---

## 7. Estimated Effort

| Phase | Time | Description |
|---|---|---|
| Phase 1: TS infra | 15 min | tsconfig, deps, scripts, gitignore |
| Phase 2: Types | 25 min | `src/models/` (14+ interfaces, incl. plannerAliveThresholdMs) |
| Phase 3: Migration | 3-4 hours | 18 files rename + annotations (~3,300 LOC total) |
| Phase 4: Imports | 10 min | Bulk `.mjs` → `.js` |
| Phase 5: Const assertions | 15 min | `as const` + type unions (16+ constant objects) |
| Phase 6: Cleanup | 15 min | Delete root tests, migrate tests/ |
| Phase 7: Verify | 30 min | Build, typecheck, run, e2e |
| **Total** | **~5 hours** | |

---

*Created: 2026-04-07 | Updated: 2026-04-13*
