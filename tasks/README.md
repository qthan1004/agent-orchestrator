# Task Board — 2026-04-10T11:45:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 17 |
| 🔄 Processing | 0 |
| ✅ Done | 28 |
| **Total** | **45** |

Progress: 28/45 (62%)

---

## ⬜ Pending — Improve Planner & Task Quality (PQ-series)

> Ref: `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md`
> Prefix: `PQ` = Planner Quality improvement
> Target: Nâng task quality từ 4.5/10 → ≥8.5/10

### Group 1: Server — Tách Stale Threshold (no deps)
- `PQ01-split-stale-threshold-constants.md` — Tách STALE_THRESHOLD_MS → 2 constants
- `PQ02-update-consumers-new-threshold.md` → depends on PQ01 — Update 4 consumer files

### Group 2: Prompt — agent-prompt.md rewrite (no deps, parallel OK)
- `PQ03-prompt-planner-step3-rewrite.md` — Rewrite Section P Step 3 (5 sub-steps)
- `PQ04-prompt-worker-step3-expand.md` — Expand Section W Step 3 (Pre-flight + Self-Validation)
- `PQ05-prompt-add-rules-7-12.md` — Thêm rules 7-12

### Group 3: Prompt — Appendix (depends on Group 2)
- `PQ06-prompt-add-appendices.md` → depends on PQ03-05 — Appendix A (Bad/Good) + B (Cache)

### Group 4: Verification (depends on all)
- `PQ07-verify-server-start-tests.md` → depends on PQ01-06 — Full verification suite

---

## ⬜ Pending — TypeScript Migration (M-series)

> Ref: `dev-docs/migrate-to-typescript.md`
> Prefix: `M` = Migration task

### Group 1: Foundation (no deps)
- `M01-ts-infra-setup.md` — tsconfig.json, devDeps, scripts, .gitignore
- `M02-shared-types.md` → depends on M01 — `src/types.ts` shared interfaces

### Group 2: File Migration (bottom-up layers)
- `M03-migrate-layer1-leaves.md` → depends on M02 — constants, file-backend, logger
- `M04-migrate-layer2-utils.md` → depends on M03 — config, bootstrap, worker-registry, startup-prompt
- `M05-migrate-layer3-mcp-internals.md` → depends on M04 — task-queue, poll-helpers, idle-resolver, state-manager, recovery, plan-watcher
- `M06-migrate-layer4-toplevel.md` → depends on M05 — server, tools ⭐, transport, index (entry points)

### Group 3: Cleanup
- `M07-cleanup-tests.md` → depends on M06 — delete root scripts, migrate tests/*.mjs → .ts

### Group 4: Verification
- `M08-verify-build-e2e.md` → depends on M07 — typecheck, build, serve, e2e test

---

## ⬜ Pending — Misc

- `03-worker-auto-kill.md` — Auto-kill stale workers + task requeue

---

## ⬜ Done — v2 Server Optimization & Bug Fixes

> Plan: `tasks/done/plan-v2-server-optimization.md`

### Phase 1: Server Core (Group 1-3)
- `01-constants-roles-actions.md` — Constants: WORKER_ROLE, AGENT_ACTION, POLL_DEFAULTS
- `02-config-poll-startup.md` — Config: polling + recovery fields
- `03-worker-registry-roles.md` — WorkerRegistry: role field + getActivePlanner
- `04-state-manager-plans-quick.md` — StateManager: checkPlansQuick() + getProcessingPlan()
- `05-long-poll-helpers.md` — waitForTask/waitForPlan Long Polling helpers
- `06-get-next-task-longpoll.md` — get_next_task: Long Poll + IDLE/EXECUTE directive
- `07-check-plans-longpoll.md` — check_plans: Long Poll + IDLE/DECOMPOSE directive

### Phase 2: Combo Tools & Push-to-Server (Group 4-6)
- `08-register-worker-role.md` — register_worker: gộp role + single planner
- `09-resolve-idle-action.md` — resolveIdleAction: BECOME_PLANNER logic
- `10-complete-task-combo.md` — complete_task: auto_pickup + re-election
- `11-auto-heartbeat.md` — Auto-heartbeat middleware
- `12-submit-decomposition-combo.md` — submit_decomposition: combo next plan

### Phase 3: Bug Fixes & Safety (Group 7-8)
- `13-state-manager-error-handling.md` — Error handling moveToActive/Outbox
- `14-task-queue-rename.md` — Rename completeTask → updateTaskStatus
- `15-force-release-task.md` — New MCP tool: force_release_task
- `16-startup-prompt.md` — Interactive startup prompt (default/custom)
- `17-index-integrate-prompt.md` — Integrate promptConfig → startServer

### Phase 4: Prompts & Docs (Group 9-10)
- `18-prompt-templates.md` — prompts/ folder: planner + worker templates
- `19-skill-md-update.md` — SKILL.md: 2-mode, inline task, role transitions
- `20-update-todo-fixes.md` — TODO_FIXES.md: update status + references

---

## ✅ Done (v1 — POC Phase)
- `01-mcp_init-project.md`
- `02-mcp_stdio-hello-world.md`
- `03-mcp_config-antigravity-test.md`
- `04-mcp_streamable-http.md`
- `05-mcp_config-mcp-remote.md`
- `06-mcp_multi-session-hardening.md`
- `07-skills_orchestrator-protocol.md`
- `08-workflows_create-all.md`
- `09-skills_symlink-templates.md`
- `10-tools_create-automation.md`
- `11-utils_file-backend-logger.md`
- `12-mcp_state-manager-queue-plan.md`
- `12-mcp_state-manager-queue.md`
- `13-mcp_implement-all-tools.md`
- `14-mcp_recovery-crash-test.md`
- `15-test_end-to-end-flow.md`
- `HF-A_server-factory.md`
- `HF-B_transport-multi-session.md`
- `HF-C_tool-error-handling.md`