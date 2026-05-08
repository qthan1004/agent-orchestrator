# Task P2-PRE: Phase 1 Cleanup — Archive & Clean Slate

## Info
- **ID:** P2-PRE-phase1-cleanup
- **Module:** Entire codebase
- **Group:** Pre-Sprint 0 (trước P2-00)
- **Dependencies:** none — chạy TRƯỚC tất cả P2 tasks
- **Priority:** 0 (highest)
- **Ref:** `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Context

Phase 1 là PoC (proof of concept) để validate approach. Phase 2 bắt đầu sạch.
Toàn bộ Phase 1 source code sẽ được **archive** (không xóa) để giữ reference.

## Decisions đã chốt

| # | Quyết định | Chi tiết |
|---|-----------|----------|
| 1 | Brain Watcher | **Archive** — move vào `_archive/` |
| 2 | prompts/ + templates/ | **Archive** — move vào `_archive/` |
| 3 | tasks/done/ (63 files) | **Remove** — sẽ tạo lại tại workspace, không cần ở đây |
| 4 | Archive method | **`_archive/` subfolder** — để sau biết mình đã làm gì |

## What to do

### Step 1: Create `_archive/phase1/` at project root

```
_archive/
└── phase1/
    ├── src/           ← toàn bộ src/ Phase 1
    ├── tests/         ← toàn bộ tests/
    ├── prompts/       ← agent-prompt.md, README.md
    └── templates/     ← JSON templates, knowledge.md
```

### Step 2: Archive Phase 1 source

Move các files/folders sau vào `_archive/phase1/`:

```
src/config.ts                    → _archive/phase1/src/
src/constants.ts                 → _archive/phase1/src/
src/index.ts                     → _archive/phase1/src/
src/mcp-server/                  → _archive/phase1/src/mcp-server/
src/models/                      → _archive/phase1/src/models/
src/agents/                      → _archive/phase1/src/agents/
src/utils/bootstrap.ts           → _archive/phase1/src/utils/
src/utils/startup-prompt.ts      → _archive/phase1/src/utils/
src/utils/worker-registry.ts     → _archive/phase1/src/utils/
.agent/tools/                    → _archive/phase1/.agent-tools/  (Phase 1 .mjs scripts)
```

### Step 3: Giữ lại skeleton utils

```
src/
└── utils/
    ├── file-backend.ts    ← GIỮ — pure file I/O utility
    └── logger.ts          ← GIỮ — pure logging utility
```

### Step 4: Archive prompts/ và templates/

```
prompts/agent-prompt.md          → _archive/phase1/prompts/
prompts/README.md                → _archive/phase1/prompts/
templates/*.json                 → _archive/phase1/templates/
templates/knowledge.md           → _archive/phase1/templates/
```

Sau move, giữ lại `prompts/` và `templates/` folders rỗng (hoặc với .gitkeep).

### Step 5: Remove tasks/done/

Xóa toàn bộ 63 files trong `tasks/done/`. Giữ lại folder `tasks/done/` rỗng với `.gitkeep`.

### Step 6: Clean exchange/ data

```
exchange/inbox/      → clear contents (giữ folder)
exchange/active/     → clear contents (giữ folder)
exchange/outbox/     → clear contents (giữ folder)
exchange/logs/       → clear contents (giữ folder)
exchange/checkpoints/ → clear contents (giữ folder)
exchange/_queue.json  → reset to {"tasks":[]}
```

### Step 7: Clear dist/

Xóa nội dung `dist/` (build output cũ).

### Step 8: Update task board

- Remove tất cả ✅ Done sections cũ (EV, PQ, PING, M, v2, Misc) khỏi `tasks/README.md`
- Chỉ giữ: P2-series (pending) + WM-series (deferred)
- Update count

### Step 9: Verify

- `npm run build` pass (chỉ compile `src/utils/`)
- Không còn Phase 1 imports nào broken
- `_archive/phase1/` chứa đầy đủ code cũ để reference
- Task board sạch, chỉ P2 tasks

## Files

| Action | Path |
|--------|------|
| NEW | `_archive/phase1/` (toàn bộ Phase 1 code) |
| MOVE | `src/**` (trừ utils/file-backend.ts, utils/logger.ts) → `_archive/` |
| MOVE | `prompts/**` → `_archive/` |
| MOVE | `templates/**` → `_archive/` |
| MOVE | `tests/**` → `_archive/` |
| DELETE | `tasks/done/*` (63 files) |
| CLEAN | `exchange/` subdirs |
| CLEAN | `dist/` |
| MODIFY | `tasks/README.md` |

## Done Criteria
- [x] `_archive/phase1/` chứa toàn bộ Phase 1 source
- [x] `src/` chỉ còn `utils/file-backend.ts` + `utils/logger.ts`
- [x] `prompts/` rỗng hoặc có .gitkeep
- [x] `templates/` rỗng hoặc có .gitkeep
- [x] `tasks/done/` rỗng
- [x] `exchange/` subdirs rỗng
- [x] `dist/` rỗng
- [x] `tasks/README.md` updated (chỉ P2 tasks)
- [x] `npm run build` pass
