# Task Board - 2026-05-22

| Status | Count |
|--------|-------|
| Pending | 26 |
| Processing | 0 |
| Done | 40 |
| **Total** | **66** |

Progress: 40/66 (61%)

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

## Pending — Re-prioritized (2026-05-22)

> **Principle**: Immediate runtime lease refactor overrides previous FIFO order. Each IMEDIALY task has a final `### Plan Continuation` section that tells the agent whether to call `/pick-task` again or stop.
> Head (Planner) = Manual (Human + IDE agent). Design chốt 2026-05-10.

### Tier -1: IMEDIALY Runtime Lease Refactor

These tasks are highest priority. Structure refactor comes before mindset/docs alignment.

| # | Task | What | Relation |
|---|------|------|----------|
| 0 | `IMEDIALY-00-refactor-domain-structure-contracts.md` | Create domain folders/contracts first | next: IMEDIALY-01 |
| 1 | `IMEDIALY-01-refactor-constants-and-text-boundaries.md` | Move constants/text/timing into domain owners | next: IMEDIALY-02 |
| 2 | `IMEDIALY-02-refactor-runtime-lease-stores.md` | RuntimeRegistry, HeartbeatStore, PointAllocator, CapacityStore | next: IMEDIALY-03 |
| 3 | `IMEDIALY-03-refactor-scheduler-runtime-split.md` | Split scheduler policy from runtime process/session lifecycle | next: IMEDIALY-04 |
| 4 | `IMEDIALY-04-refactor-callback-lease-identity.md` | Add `runtime_id + lease_generation` to assignment/callback/recovery | next: IMEDIALY-05 |
| 5 | `IMEDIALY-05-refactor-infra-capacity-and-resource-visibility.md` | Dynamic capacity + terminal resource table, no UI | next: IMEDIALY-06 |
| 6 | `IMEDIALY-06-refactor-local-ollama-isolation.md` | Isolated Ollama runtime endpoint per lease | next: IMEDIALY-07 |
| 7 | `IMEDIALY-07-refactor-cli-runtime-adapters.md` | Codex CLI + AG CLI runtime adapter boundaries | next: IMEDIALY-08 |
| 8 | `IMEDIALY-08-mindset-docs-and-task-board-alignment.md` | Docs/skill/task board alignment after structure refactor | final section says STOP |

### Tier 0: Core Architecture Alignment (Paused Until IMEDIALY Plan Ends)

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
IMEDIALY-00 structure contracts
  → IMEDIALY-01 constants/text boundaries
  → IMEDIALY-02 runtime lease stores
  → IMEDIALY-03 scheduler/runtime split
  → IMEDIALY-04 callback lease identity
  → IMEDIALY-05 infra capacity/resource visibility
  → IMEDIALY-06 local Ollama isolation
  → IMEDIALY-07 CLI runtime adapters
  → IMEDIALY-08 docs/task-board alignment
  → STOP
```

Previous P2 path resumes after IMEDIALY plan ends:

```
P2-37 domain routing hint contract
  → P2-38 domain routing hint implementation
  → P2-39 contract/E2E gates
  → P2-40 E2E integration
```

Archived completed path:

```
P2-33 doctrine
  → P2-34 workspace bootstrap template
  → P2-35 registry invariants
  → P2-36 harness boundary
```
