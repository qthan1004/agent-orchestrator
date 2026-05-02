# Review: Phase 2 Plans vs 2026 Industry

> **Date:** 2026-05-02
> **Type:** Review / Cross-assessment
> **Status:** Completed
> **Scope:** `plan_phase2-hybrid-architecture.md` + `plan_phase2-gitops-observer.md` assessed against 2026 harness research

---

## 1. Phase 2 Hybrid Architecture — Verdict: ✅ NOT OBSOLETE

### Why it's still valid

Industry 2026 confirms: **Hybrid local+cloud is the mainstream strategy**, not niche.

- Data sovereignty → regulated industries REQUIRE local inference
- Cost control → autonomous agents = "token eaters", local = predictable cost
- Latency → zero network latency for rapid iteration
- Tooling maturity → Ollama 2026 = production-grade

### Phase 2 designs validated by industry

| Phase 2 Design | 2026 Equivalent |
|----------------|-----------------|
| Head-Body-Limb separation | Claude Code harness decoupled from sandbox |
| One-shot ephemeral workers | Cursor Background Agents (cloud sandbox) |
| Server-controlled dispatch | Claude Dispatch push model |
| 3-layer context checkpoint | LangGraph checkpoint per superstep |
| File-based IPC | Claude Agent Teams file-based task lists |
| Dynamic tool provisioning | Codex SKILL.md on-demand |
| Worker ID server-assigned | Devin sub-Devins assigned by coordinator |

**Result: 7/7 patterns validated.**

### 4 Updates needed

| # | Gap | Fix | Priority |
|---|-----|-----|----------|
| 1 | Agent Runner hard-exits on failure | Add bounded reflexion loop (diagnose → fix → retry 2x → checkpoint → exit) | 🔴 P0 |
| 2 | Manual prompt building | Use SKILL.md-based prompt (base + action-specific skill) | 🟡 P1 |
| 3 | `git checkout -b` for branches | Use `git worktree add/remove` (Cursor 3 pattern — parallel safe) | 🟡 P1 |
| 4 | Checkpoint format differs from session schema | Unify with EV09b typed schema | 🟡 P1 |

---

## 2. Phase 2 GitOps Observer — Verdict: ✅ VALID, NEEDS UPDATES

### Validated concepts

| Design | 2026 Equivalent |
|--------|-----------------|
| Git as single source of truth | Cursor 3 git worktree per agent |
| Mobile → Desktop trigger | Claude Dispatch (phone → desktop via QR code) |
| Webhook real-time ingestion | MCP 2026 Triggers & Events |
| Auto commit/push results | Devin auto-PR, Cursor auto-merge |

### 2 Updates needed

| # | Gap | Fix |
|---|-----|-----|
| 1 | Branch isolation via `git checkout` | Use `git worktree add/remove` |
| 2 | Custom webhook endpoint | Abstract into `PlanIngestionSource` interface for future MCP Triggers migration |

---

## 3. Cross-reference: Phase 2 vs Evolution Plan

### Conflicts (1 real, 3 config-level)

| Conflict | Resolution |
|----------|------------|
| Worker registration: Phase 2 = server-assigned ID vs Evolution = `register_worker()` | Both valid — Phase 2 = push mode, Evolution = pull mode. Handled by dispatch mode split |
| Stale threshold: Phase 2 = 15s vs Evolution = 90s | Config-level via `SERVER_PROFILES` |
| Checkpoint format: Phase 2 = `{completed_steps}` vs EV09b = `{files_changed, phase}` | **NEEDS MERGE** — unify schema |

### Synergies (6 confirmed)

1. One-shot workers eliminate context rot → Evolution's compaction concern solved for local workers
2. Server-controlled dispatch = same as Evolution's push_extension mode
3. 3-layer checkpoint = complementary to Evolution's session_checkpoint
4. Dynamic tool provisioning = same as SKILL.md on-demand loading
5. File-based IPC = shared infrastructure
6. GitOps Observer = future source for plan ingestion

---

## 4. Execution order

```
NOW:    Evolution Phase 2 (EV09b → EV13 → EV14)
NEXT:   Evolution Phase 3 (EV10-12 Brain Watcher)
THEN:   Phase 2 Hybrid (Agent Runner + TaskDispatchLoop + Ollama)
        ← Benefits from Evolution work (shared schemas, SKILL.md pattern)
LATER:  GitOps Observer (requires stable Hybrid mode)
```
