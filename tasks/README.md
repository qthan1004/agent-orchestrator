# Task Board — 2026-05-09

| Status | Count |
|--------|-------|
| ⬜ Pending | 23 |
| 🔄 Processing | 0 |
| ✅ Done | 12 |
| **Total** | **35** |

Progress: 12/35 (34%)
---

## ✅ Done — Pre-Sprint 0 + Sprint 0 + Sprint 1
- `P2-PRE-phase1-cleanup.md` ✅
- `P2-00-config-model-refactor.md` ✅
- `P2-01-runtime-directory-bootstrap.md` ✅
- `P2-02-workspace-registration.md` ✅
- `P2-03-statemanager-path-migration.md` ✅
- `P2-04-planwatcher-multiworkspace.md` ✅
- `P2-05-ollama-client.md` ✅
- `P2-05b-cloud-llm-adapter.md` ✅
- `P2-06-worker-process-manager.md` ✅
- `P2-07-model-selector.md` ✅
- `P2-08-server-profiles.md` ✅
- `P2-09-tool-executor.md` ✅

## ⬜ Pending — Phase 2: Hybrid Agentic Architecture (P2-series) ⭐ PRIORITY

> Ref: `dev-docs/plan_phase2-hybrid-architecture.md`
> Revised: `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`
> Prefix: `P2` = Phase 2 task
> Language: **Node.js/TypeScript** (Go migration planned for Phase 3)

### Sprint 2: Agent Runner Core ⚡ **NEXT**
- `P2-10-token-counter.md` → no deps — context window tracking
- `P2-11-agent-runner-skeleton.md` → depends P2-05, P2-09, P2-10 — one-shot executor
- `P2-12-worker-prompt-system.md` → depends P2-11 — SKILL.md prompt pattern
- `P2-13-agent-runner-reflexion.md` → depends P2-11 — bounded reflexion loop
- `P2-24-workspace-code-search.md` → no deps — workspace code search tool

### Sprint 3: Server Dispatch Integration
- `P2-14-task-dispatch-loop.md` → depends P2-03, P2-06, P2-07 — main server loop
- `P2-15-vram-manager.md` → depends P2-05, P2-07 — VRAM lifecycle
- `P2-16-server-hybrid-integration.md` → depends P2-08, P2-14, P2-15 — wire into server
- `P2-17-git-worktree.md` → depends P2-06 — branch isolation

### Sprint 4: Polish + E2E + Intelligence ⚡ **expanded**
- `P2-18-unified-checkpoint.md` → depends P2-13 — unified checkpoint format
- `P2-19-mandatory-changelog.md` → depends P2-12, P2-13 — worker changelog
- `P2-20-e2e-integration.md` → depends P2-16 — full E2E tests
- `P2-21-readme-docs-update.md` → depends P2-20 — README + docs
- `P2-22-case-bank-save.md` → depends P2-13 — post-task reflection → save .md to global case-bank ⚡ **NEW**
- `P2-23-domain-auto-detect.md` → depends P2-01 — scan manifest → detect domain tag ⚡ **NEW**

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

