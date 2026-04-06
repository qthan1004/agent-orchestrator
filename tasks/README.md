# Task Board — 2026-04-06T11:00:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 20 |
| 🔄 Processing | 0 |
| ✅ Done | 19 |
| **Total** | **39** |

Progress: 19/39 (49%)

---

## ⬜ Pending — v2 Server Optimization & Bug Fixes

> Plan: `tasks/pending/plan-v2-server-optimization.md`

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