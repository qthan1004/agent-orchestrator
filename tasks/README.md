# Task Board — 2026-04-21T23:01:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 8 |
| 🔄 Processing | 0 |
| ✅ Done | 52 |
| **Total** | **60** |

Progress: 52/60 (87%)

---

## ⬜ Pending — Evolution & Local Brain (EV-series)

> Ref: `dev-docs/plan_evolution-and-local-brain.md`
> Prefix: `EV` = Evolution task

### Group 1: AG Ecosystem Setup (Phase 1 — no code, config only)
- `EV01-create-gemini-md.md` ✅
- `EV02-create-agent-rules.md` ✅
- `EV03-global-workflows.md` ✅
- `EV04-mcp-config-enhancement.md` ✅
- `EV05-browser-prompting.md` ✅

### Group 2: Workspace Memory Injection (Phase 2 — new MCP tools)
- `EV06-scan-workspace-tool.md` → depends on EV01 — `scan_workspace` MCP tool
- `EV07-session-checkpoint-tool.md` → depends on EV01 — `session_checkpoint` MCP tool
- `EV08-stale-recovery-enhancement.md` → depends on EV07 — state-manager recovery signals
- `EV09-agent-prompt-session.md` → depends on EV06, EV07 — prompt template + Session Protocol

### Group 3: Brain Watcher (Phase 3 — AG-specific)
- `EV10-brain-watcher-service.md` → depends on EV08 — .pb poll + stuck detection
- `EV11-desktop-notification.md` → depends on EV10 — node-notifier integration
- `EV12-brain-watcher-integration.md` → depends on EV10, EV11 — npm script + optional server embed

> **Phase 4** (Local RAG) → Separate plan: `dev-docs/plan_local-rag-gitnaxus-obsidian.md`
> **Phase 5** (Semi-Auto Recovery) → DEFERRED, implement after Phase 1-4 stable

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

---

## ✅ Done — TypeScript Migration (M-series)

> Ref: `dev-docs/done/plan_migrate-to-typescript.md`
> Prefix: `M` = Migration task
> Merged: PR #1 (2026-04-21)

- `M01-ts-infra-setup.md` ✅ — tsconfig.json, devDeps, scripts, .gitignore
- `M02-shared-types.md` ✅ — `src/models/` shared interfaces (8 files)
- `M03-migrate-layer1-leaves.md` ✅ — constants, file-backend, logger
- `M04-migrate-layer2-utils.md` ✅ — config, bootstrap, worker-registry, startup-prompt
- `M05-migrate-layer3-mcp-internals.md` ✅ — task-queue, poll-helpers, idle-resolver, state-manager, recovery, plan-watcher
- `M06-migrate-layer4-toplevel.md` ✅ — server, tools, transport, index
- `M07-cleanup-tests.md` ✅ — delete root scripts, migrate tests/*.mjs → .ts
- `M08-verify-build-e2e.md` ✅ — typecheck, build, serve, e2e test