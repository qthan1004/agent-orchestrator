# Task Board — 2026-05-08

| Status | Count |
|--------|-------|
| ⬜ Pending | 34 |
| 🔄 Processing | 0 |
| ✅ Done | 0 |
| **Total** | **34** |

Progress: 0/34 (0%)
---

## ⬜ Pending — Phase 2: Hybrid Agentic Architecture (P2-series) ⭐ PRIORITY

> Ref: `dev-docs/plan_phase2-hybrid-architecture.md`
> Revised: `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`
> Prefix: `P2` = Phase 2 task
> Includes: 3-Tier refactor (Sprint 0) merged into Phase 2
> Language: **Node.js/TypeScript** (Go migration planned for Phase 3)

### Pre-Sprint 0: Clean Slate ⚡ **NEW**
- `P2-PRE-phase1-cleanup.md` → no deps — **RUN FIRST** — Archive Phase 1 code, clean codebase for P2

### Sprint 0: 3-Tier Infrastructure
- `P2-00-config-model-refactor.md` → no deps — AppConfig split + runtimeRoot
- `P2-01-runtime-directory-bootstrap.md` → depends P2-00 — `~/.orchestrator/` structure ⚡ **+case-bank/ dir**
- `P2-02-workspace-registration.md` → depends P2-01 — WorkspaceRegistry + register_worker
- `P2-03-statemanager-path-migration.md` → depends P2-00, P2-02 — workspace-scoped paths
- `P2-04-planwatcher-multiworkspace.md` → depends P2-02, P2-03 — multi-workspace + result sync

### Sprint 1: LLM Adapter + Process Management ⚡ **renamed**
- `P2-05-llm-adapter.md` → no deps — LLMAdapter interface + OllamaAdapter ⚡ **renamed from ollama-client**
- `P2-06-worker-process-manager.md` → no deps — spawn/kill subprocess
- `P2-07-model-selector.md` → depends P2-05 — Quality/Throughput selection
- `P2-08-server-profiles.md` → depends P2-00 — DEFAULT vs HYBRID mode

### Sprint 2: Agent Runner Core ⚡ **expanded**
- `P2-09-tool-executor.md` → no deps — workspace-sandboxed tool execution
- `P2-10-token-counter.md` → no deps — context window tracking
- `P2-11-agent-runner-skeleton.md` → depends P2-05, P2-09, P2-10 — one-shot executor ⚡ **uses LLMAdapter, documents language-agnostic contract**
- `P2-12-worker-prompt-system.md` → depends P2-11 — SKILL.md prompt pattern ⚡ **loads from reference/skills/**
- `P2-13-agent-runner-reflexion.md` → depends P2-11 — bounded reflexion loop ⚡ **+post-task reflection save to case-bank**
- `P2-05b-cloud-llm-adapter.md` → depends P2-05 — GeminiAdapter for cloud LLM ⚡ **NEW**

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

