# Task Board - 2026-05-10

| Status | Count |
|--------|-------|
| Pending | 23 |
| Processing | 0 |
| Done | 23 |
| **Total** | **46** |

Progress: 23/46 (50%)

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

## Pending — Re-prioritized (2026-05-10)

> **Principle**: Tasks ordered by dependency chain + E2E critical path.
> Head (Planner) = Manual (Human + IDE agent). Design chốt 2026-05-10.

### Tier 1: Foundations (no deps, do first)

These are independent contracts — can be done in any order or parallel.

| # | Task | What | Deps |
|---|------|------|------|
| 1 | `T01-P2-26-workspace-scope-contract.md` | Workspace identity + runtime boundary contract | None |
| 2 | `T02-P2-25-assignment-api-contract.md` | Worker-facing assignment API contract | None |

### Tier 2: First-order dependents

| # | Task | What | Deps |
|---|------|------|------|
| 3 | `T03-P2-30-worker-registration-validation.md` | Enforce workspace_path in registration | P2-26 |
| 4 | `T04-P2-31-mandatory-startup-workspace-path.md` | Require workspace at server startup | P2-26 |
| 5 | `T05-P2-34-head-submit-task-api.md` | **Head→Server submit_task + metadata + conflict detection + scope enforce** | P2-25, P2-26 |

### Tier 3: Dispatch integration

| # | Task | What | Deps |
|---|------|------|------|
| 6 | `T06-P2-28-orchestrator-owned-dispatch.md` | Orchestrator pushes work (assignment semantics) | P2-25, P2-26, P2-30 |
| 7 | `T07-P2-27-deprecate-pull-apis.md` | Mark get_next_task etc. as legacy | P2-25, P2-28 |

### Tier 4: E2E + Polish

| # | Task | What | Deps |
|---|------|------|------|
| 8 | `T08-P2-20-e2e-integration.md` | Full E2E test: Planner→Server→Worker | P2-16, P2-25, P2-26, P2-28, P2-30 |
| 9 | `T09-P2-32-close-workspace-lifecycle.md` | Safe workspace detach/close | P2-26, P2-31, P2-30 |
| 10 | `T10-P2-33-workspace-reconnect-policy.md` | Reconnect previously closed workspace | P2-26, P2-31, P2-32 |

### Tier 5: Post-core features (independent, lower priority)

| # | Task | What | Deps |
|---|------|------|------|
| 11 | `T11-P2-22-case-bank-save.md` | Post-task reflection → global case-bank | P2-13 ✅ |
| 12 | `T12-P2-23-domain-auto-detect.md` | Scan manifest → detect domain tag | P2-01 ✅ |
| 13 | `T13-P2-21-readme-docs-update.md` | README + docs update | P2-20 |
| 14 | `T14-P2-29-memory-boundary-tests.md` | Workspace memory isolation tests | P2-22, P2-26 |
| 15 | `T15-P2-24-workspace-code-search.md` | Standalone code search lib (separate repo) | None |

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

## Critical Path to E2E

```
P2-26 (scope contract)  ──┬──→ P2-30 (registration) ──┐
                          ├──→ P2-31 (startup)         │
                          │                             ↓
P2-25 (assignment API)  ──┼──→ P2-34 (submit_task)   → P2-28 (dispatch) → P2-20 (E2E)
                          │                             ↑
                          └─────────────────────────────┘
```

**Shortest path**: P2-26 → P2-25 → P2-30 → P2-34 → P2-28 → P2-20
