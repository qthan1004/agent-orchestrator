# Task Board — 2026-05-04T10:54:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 30 |
| 🔄 Processing | 0 |
| ✅ Done | 52 |
| **Total** | **82** |

Progress: 52/82 (63%)

---

## ⬜ Pending — Phase 2: Hybrid Agentic Architecture (P2-series) ⭐ PRIORITY

> Ref: `dev-docs/plan_phase2-hybrid-architecture.md` + `dev-docs/2026-05-04_research_exchange-placement-3tier-architecture.md`
> Prefix: `P2` = Phase 2 task
> Includes: 3-Tier refactor (Sprint 0) merged into Phase 2

### Sprint 0: 3-Tier Infrastructure
- `P2-00-config-model-refactor.md` → no deps — AppConfig split + runtimeRoot
- `P2-01-runtime-directory-bootstrap.md` → depends P2-00 — `~/.orchestrator/` structure
- `P2-02-workspace-registration.md` → depends P2-01 — WorkspaceRegistry + register_worker
- `P2-03-statemanager-path-migration.md` → depends P2-00, P2-02 — workspace-scoped paths
- `P2-04-planwatcher-multiworkspace.md` → depends P2-02, P2-03 — multi-workspace + result sync

### Sprint 1: Ollama + Process Management
- `P2-05-ollama-client.md` → no deps — Ollama REST API wrapper
- `P2-06-worker-process-manager.md` → no deps — spawn/kill subprocess
- `P2-07-model-selector.md` → depends P2-05 — Quality/Throughput selection
- `P2-08-server-profiles.md` → depends P2-00 — DEFAULT vs HYBRID mode

### Sprint 2: Agent Runner Core
- `P2-09-tool-executor.md` → no deps — workspace-sandboxed tool execution
- `P2-10-token-counter.md` → no deps — context window tracking
- `P2-11-agent-runner-skeleton.md` → depends P2-05, P2-09, P2-10 — one-shot executor
- `P2-12-worker-prompt-system.md` → depends P2-11 — SKILL.md prompt pattern
- `P2-13-agent-runner-reflexion.md` → depends P2-11 — bounded reflexion loop

### Sprint 3: Server Dispatch Integration
- `P2-14-task-dispatch-loop.md` → depends P2-03, P2-06, P2-07 — main server loop
- `P2-15-vram-manager.md` → depends P2-05, P2-07 — VRAM lifecycle
- `P2-16-server-hybrid-integration.md` → depends P2-08, P2-14, P2-15 — wire into server
- `P2-17-git-worktree.md` → depends P2-06 — branch isolation

### Sprint 4: Polish + E2E
- `P2-18-unified-checkpoint.md` → depends P2-13 — unified checkpoint format
- `P2-19-mandatory-changelog.md` → depends P2-12, P2-13 — worker changelog
- `P2-20-e2e-integration.md` → depends P2-16 — full E2E tests
- `P2-21-readme-docs-update.md` → depends P2-20 — README + docs

---

## ⬜ Pending — Workspace Memory Pipeline (WM-series) — DEFERRED

> Ref: `dev-docs/plan_workspace-memory-pipeline.md`
> Prefix: `WM` = Workspace Memory task
> Status: **DEFERRED** — not blocking Phase 2, will be addressed after P2 stable

- `WM01-rag-service-scaffold.md` — Phase 4 scope
- `WM02-file-scanner-refactor.md` — improve later
- `WM03-git-context-analyzer.md` — Phase 4 scope
- `WM04-memory-generator.md` — Phase 4 scope
- `WM05-scan-workspace-v2.md` — improve later
- `WM06-update-memory-tool.md` — Phase 4 scope
- `WM07-prompt-memory-lifecycle.md` — post Phase 2
- `WM08-e2e-verification.md` — post Phase 2

---

## ✅ Done — Evolution & Local Brain (EV-series)

> Ref: `dev-docs/plan_evolution-and-local-brain.md`
> Prefix: `EV` = Evolution task

### Group 1: AG Ecosystem Setup (Phase 1 — no code, config only)
- `EV01-create-gemini-md.md` ✅
- `EV02-create-agent-rules.md` ✅
- `EV03-global-workflows.md` ✅
- `EV04-mcp-config-enhancement.md` ✅
- `EV05-browser-prompting.md` ✅

### Group 2: Workspace Memory Injection (Phase 2 — new MCP tools)
- `EV06-scan-workspace-tool.md` ✅
- `EV07-session-checkpoint-tool.md` ✅
- `EV08-stale-recovery-enhancement.md` ✅
- `EV09-agent-prompt-session.md` ✅

### Group 3: Brain Watcher (Phase 3 — AG-specific)
- `EV10-brain-watcher-service.md` ✅
- `EV11-desktop-notification.md` ✅
- `EV12-brain-watcher-integration.md` ✅

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