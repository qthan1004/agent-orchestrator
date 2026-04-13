# Task Board — 2026-04-13T16:40:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 8 |
| 🔄 Processing | 0 |
| ✅ Done | 39 |
| **Total** | **47** |

Progress: 39/47 (83%)

---

## ⬜ Pending — TypeScript Migration (M-series)

> Ref: `dev-docs/migrate-to-typescript.md`
> Prefix: `M` = Migration task

### Group 1: Foundation (no deps)
- `M01-ts-infra-setup.md` — tsconfig.json, devDeps, scripts, .gitignore
- `M02-shared-types.md` → depends on M01 — `src/types.ts` shared interfaces (14+ interfaces, incl. plannerAliveThresholdMs)

### Group 2: File Migration (bottom-up layers)
- `M03-migrate-layer1-leaves.md` → depends on M02 — constants (135 LOC), file-backend, logger
- `M04-migrate-layer2-utils.md` → depends on M03 — config, bootstrap, worker-registry (147 LOC), startup-prompt
- `M05-migrate-layer3-mcp-internals.md` → depends on M04 — task-queue (194 LOC), poll-helpers (78 LOC), idle-resolver, state-manager, recovery, plan-watcher
- `M06-migrate-layer4-toplevel.md` → depends on M05 — server, tools ⭐ (698 LOC), transport, index (154 LOC)

### Group 3: Cleanup
- `M07-cleanup-tests.md` → depends on M06 — delete root scripts, migrate tests/*.mjs → .ts

### Group 4: Verification
- `M08-verify-build-e2e.md` → depends on M07 — typecheck, build, serve, e2e test

---

## ✅ Done — Improve Planner & Task Quality (PQ-series)

> Ref: `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md`
> Prefix: `PQ` = Planner Quality improvement
> Target: Nâng task quality từ 4.5/10 → ≥8.5/10

### Group 1: Server — Tách Stale Threshold
- `PQ01-split-stale-threshold-constants.md` ✅
- `PQ02-update-consumers-new-threshold.md` ✅

### Group 2: Prompt — agent-prompt.md rewrite
- `PQ03-prompt-planner-step3-rewrite.md` ✅
- `PQ04-prompt-worker-step3-expand.md` ✅
- `PQ05-prompt-add-rules-7-12.md` ✅

### Group 3: Prompt — Appendix
- `PQ06-prompt-add-appendices.md` ✅

### Group 4: Verification
- `PQ07-verify-server-start-tests.md` ✅

---

## ✅ Done — Ping feature (PING-series)

- `PING01-add-ping-constants.md` ✅
- `PING02-register-ping-tool.md` ✅
- `PING03-update-ping-prompts.md` ✅

---

## ✅ Done — Misc

- `03-worker-auto-kill.md` ✅ — Auto-kill stale workers + task requeue
- `01-zod-passthrough-compact.md` ✅
- `02-add-path-context.md` ✅
- `04-enforce-source-plan.md` ✅
- `05-strengthen-idle-loop.md` ✅
- `06-planner-discovery-phase.md` ✅
- `plan-phase1-prompt-fixes.md` ✅
- `TODO_FIXES.md` ✅

---

## ✅ Done — v2 Server Optimization & Bug Fixes

> Plan: `tasks/done/plan-v2-server-optimization.md`

### Phase 1: Server Core (Group 1-3)
- `01-constants-roles-actions.md` ✅
- `02-config-poll-startup.md` ✅
- `03-worker-registry-roles.md` ✅
- `04-state-manager-plans-quick.md` ✅
- `05-long-poll-helpers.md` ✅
- `06-get-next-task-longpoll.md` ✅
- `07-check-plans-longpoll.md` ✅

### Phase 2: Combo Tools & Push-to-Server (Group 4-6)
- `08-register-worker-role.md` ✅
- `09-resolve-idle-action.md` ✅
- `10-complete-task-combo.md` ✅
- `11-auto-heartbeat.md` ✅
- `12-submit-decomposition-combo.md` ✅

### Phase 3: Bug Fixes & Safety (Group 7-8)
- `13-state-manager-error-handling.md` ✅
- `14-task-queue-rename.md` ✅
- `15-force-release-task.md` ✅
- `16-startup-prompt.md` ✅
- `17-index-integrate-prompt.md` ✅

### Phase 4: Prompts & Docs (Group 9-10)
- `18-prompt-templates.md` ✅
- `19-skill-md-update.md` ✅
- `20-update-todo-fixes.md` ✅