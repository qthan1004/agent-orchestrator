# Task Board - 2026-05-21

| Status | Count |
|--------|-------|
| Pending | 21 |
| Processing | 0 |
| Done | 36 |
| **Total** | **57** |

Progress: 36/57 (63%)

---

## Done (Sprint 0 → Sprint 3 + misc)
- `P2-PRE-phase1-cleanup.md`
- `P2-00-config-model-refactor.md`
- `P2-01-runtime-directory-bootstrap.md`
- `P2-02-workspace-registration.md`
- `P2-03-statemanager-path-migration.md`
- `P2-04-planwatcher-multiworkspace.md`
- `P2-05-ollama-client.md`
- `P2-05b-cloud-llm-adapter.md`
- `P2-06-worker-process-manager.md`
- `P2-07-model-selector.md`
- `P2-08-server-profiles.md`
- `P2-09-tool-executor.md`
- `P2-10-token-counter.md`
- `P2-11-agent-runner-skeleton.md`
- `P2-12-worker-prompt-system.md`
- `P2-12b-prompt-builder-integration.md`
- `P2-13-agent-runner-reflexion.md`
- `P2-14-task-dispatch-loop.md`
- `P2-15-vram-manager.md`
- `P2-16-server-hybrid-integration.md`
- `P2-17-git-worktree.md`
- `P2-18-unified-checkpoint.md`
- `P2-19-mandatory-changelog.md`
- `P2-20-workspace-scope-contract.md`
- `P2-21-mandatory-startup-workspace-path.md`
- `P2-22-worker-registration-validation.md`
- `P2-23-close-workspace-lifecycle.md`
- `P2-24-workspace-reconnect-policy.md`
- `P2-25-assignment-api-contract.md`
- `P2-26-head-submit-task-api.md`
- `P2-27-deprecate-pull-apis.md`
- `P2-28-orchestrator-owned-dispatch.md`

## Pending — Re-prioritized (2026-05-21)

> **Principle**: Tasks ordered by dependency chain + E2E critical path.
> Head (Planner) = Manual (Human + IDE agent). Design chốt 2026-05-10.

### Tier 0: Core Architecture Alignment

These tasks lock the core concept before more runtime work:

| # | Task | What | Deps |
|---|------|------|------|
| 1 | `P2-33-pure-orchestrator-doctrine.md` | Only Planner has brain; server/harness/worker boundaries | None |
| 2 | `P2-34-workspace-bootstrap-template.md` | Bootstrap `.orchestrator/` inside registered workspaces | P2-33 |
| 3 | `P2-35-registry-identity-invariants.md` | Workspace/worker/task registry invariants | P2-34 |
| 4 | `P2-36-harness-module-boundary.md` | Extract Harness as independent runtime module | P2-33, P2-35 |
| 5 | `P2-37-domain-routing-hint-contract.md` | Domain tag → tool/skill bundle, no intelligence | P2-33, P2-36 |
| 6 | `P2-38-domain-routing-hint.md` | Implement shallow routing hint | P2-33, P2-36, P2-37 |
| 7 | `P2-39-contract-e2e-gates.md` | Build + contract + real E2E done gates | P2-34, P2-35, P2-36, P2-37 |
| 8 | `P2-40-e2e-integration.md` | Full E2E test: Planner→Server→Worker | P2-39 |

### Tier 1: Post-core / Governance

| # | Task | What | Deps |
|---|------|------|------|
| 9 | `P2-41-readme-docs-update.md` | README + docs update | P2-40, P2-27 |
| 10 | `P2-42-knowledge-promotion-pipeline.md` | Worker proposal → Planner evaluation → User approval | P2-33, P2-37 |
| 11 | `P2-43-case-bank-save.md` | Post-task reflection proposal/report save | P2-13, P2-01, P2-38, P2-20, P2-42 |
| 12 | `P2-44-memory-boundary-tests.md` | Workspace memory isolation tests | P2-43, P2-20 |
| 13 | `P2-45-workspace-code-search.md` | Standalone code search lib (separate repo) | None |

### Deferred — Workspace Memory Pipeline (WM-series)

> Status: **DEFERRED** — not blocking Phase 2

- `WM01-rag-service-scaffold.md`
- `WM02-file-scanner-refactor.md`
- `WM03-git-context-analyzer.md`
- `WM04-memory-generator.md`
- `WM05-scan-workspace-v2.md`
- `WM06-update-memory-tool.md`
- `WM07-prompt-memory-lifecycle.md`
- `WM08-e2e-verification.md`

---

## Core Critical Path

```
P2-33 doctrine
  → P2-34 workspace bootstrap template
  → P2-35 registry invariants
  → P2-36 harness boundary
  → P2-37 domain routing hint contract
  → P2-38 domain routing hint implementation
  → P2-39 contract/E2E gates
  → P2-40 E2E integration
```
