# Research: 2026 Agent Harness & Session Protocol Benchmark

> **Date:** 2026-05-02
> **Type:** Research
> **Status:** Completed
> **Scope:** Benchmark orchestrator against 8 modern agent harnesses (Claude Code, Claude Cowork/Dispatch, Devin AI, Cursor 3, OpenAI Codex CLI, Gemini CLI v0.40, LangGraph, MCP 2026 spec)

---

## 1. 2026 Paradigm Shifts (vs 2025)

| 2025 | 2026 |
|------|------|
| Agent = interactive chat that calls tools | Agent = **persistent background process** with durable state |
| Context management = user responsibility | Context management = **harness-managed** (auto-compaction, micro-compaction, chapter isolation) |
| Recovery = restart and hope | Recovery = **event-sourced replay** from exact failure point |

---

## 2. Key 2026 Events Tracked

| Event | Impact |
|-------|--------|
| **Claude Code: Dispatch + Remote Control** | Headless agent on local machine, controlled from mobile. Shift from interactive → persistent background |
| **Claude Code: Cached Micro-compaction** | Per-turn tool result compaction — keeps context clean without full summarization |
| **Claude Code: Harness decoupled from sandbox** | Harness communicates via `execute` calls — robust on crash |
| **Cursor 3: Background Agents + `/worktree` + `/best-of-n`** | Async agents on cloud sandbox. Git worktree per agent for isolation |
| **Devin: Multi-agent orchestration + Interactive Planning Checkpoints** | Coordinator for team of sub-Devins. Human review before compute burn |
| **Devin: PR merge rate 67%** (vs 34% 2025) | Quality doubled via playbooks + self-healing reflexion loops |
| **Codex: Durable Execution (event-sourced)** | Resume from exactly point of failure — no redo. Temporal-like pattern |
| **Codex: SKILL.md manifests** | On-demand skill loading based on task matching |
| **LangGraph: Checkpoint per superstep + Time Travel** | State saved per node. Fork/rewind/resume at any point |
| **MCP 2026: `Mcp-Session-Id` + Tasks primitive** | Session affinity. New "Tasks" primitive for long-running work |
| **MCP 2026: Server Cards + Triggers** | `.well-known` discovery. Server-initiated events (webhooks for MCP) |
| **Gemini CLI v0.40: Chapters + 4-tier memory** | Sessions grouped by Chapters. Prompt-driven 4-tier memory system |

---

## 3. Benchmark: Orchestrator vs 2026 Industry

| Feature | 2026 State-of-art | Orchestrator | Gap |
|---------|-------------------|--------------|-----|
| Session persistence | Event-sourced log (Codex) / append-only (Claude Code) | Manual JSON save via tool call | 🔴 Large |
| Resume | Automatic replay from last checkpoint | Agent must call load + parse | 🔴 Large |
| Context compaction | Micro-compaction per turn + auto at 92% (Claude Code) | None (out of our control) | 🔴 Large |
| Self-healing | Bounded reflexion + auto error diagnosis (LangGraph/Devin) | "fix and retry" with no structure | 🟡 Medium |
| System prompt | Dynamic assembly + SKILL.md on-demand (Codex/Claude Code) | Static 455-line flat markdown | 🟡 Medium |
| Parallel agents | Git worktree per agent (Cursor 3) / multi-Devin | Single worker at a time | 🟡 Medium |
| Background/headless | Headless CLI (claude -p, codex) / Dispatch | Requires interactive IDE | 🟡 Medium |
| Task queue / IPC | Claude Agent Teams: file-based task lists | File-based IPC inbox/active/outbox | ✅ On par |
| Recovery infra | Heartbeat + orphan detection | Heartbeat middleware + RecoveryManager | ✅ On par |

---

## 4. Gap Analysis — 6 Issues

### 🔴 Gap 1: Boot sequence not deterministic
Section 1 says "When starting, you MUST" without referencing Session Protocol. Agent may skip session check.

### 🔴 Gap 2: Retry = redo from scratch
No retry-aware logic. Agent with retry_count=2 executes fresh, duplicating work.

### 🔴 Gap 3: Session schema unstructured
`context: Record<string, unknown>` — each agent stores different formats.

### 🟡 Gap 4: Prompt 455 lines, not modular
Worker reads 180 lines of planner-only content unnecessarily.

### 🟡 Gap 5: Self-validation unstructured
"if verification fails → fix it" — no bounded retry, no diagnosis.

### 🟢 Gap 6: MCP Session-Id not used
Orchestrator uses streamable HTTP but doesn't leverage session affinity.

---

## 5. Priority Matrix

| # | Item | Source | Effort | Impact | Priority |
|---|------|--------|--------|--------|----------|
| 1 | Session schema spec | LangGraph typed state | S | High | 🔴 P0 |
| 2 | Retry-aware resume | Codex durable execution | S | High | 🔴 P0 |
| 3 | Boot sequence fix | Claude Code deterministic boot | XS | High | 🔴 P0 |
| 4 | Bounded reflexion loop | LangGraph + Devin self-heal | S | High | 🔴 P0 |
| 5 | Prompt modularization | Codex SKILL.md | M | High | 🟡 P1 |
| 6 | Graceful pause | Claude --continue | XS | Medium | 🟡 P1 |
| 7 | Context-aware loading | Cursor discovery | XS | Medium | 🟢 P2 |
| 8 | Error diagnosis carry-over | Devin self-heal | S | Medium | 🟢 P2 |
| 9 | Adopt Mcp-Session-Id | MCP 2026 spec | S | Low | 🔮 Future |
| 10 | Tasks primitive adoption | MCP 2026 roadmap | L | High | 🔮 Future |
| 11 | Event-sourced execution | Codex/Temporal | L | High | 🔮 Future |
| 12 | Background agent (push_extension) | Claude Dispatch | L | High | 🔮 Future (Phase 5) |

---

## 6. Action Items → EV Tasks Created

- **EV09b**: Prompt Enhancement — session schema, retry-aware, boot fix, reflexion, pause handler
- **EV13**: Prompt Modularization — extract Section P to SKILL.md (38% reduction)
- **EV14**: Error Diagnosis Persistence — session v2 schema, error context carry-over

---

## 7. Key Insight

> **2026 = "Durable Agents" era.** All top harnesses implement event-level persistence — agents SURVIVE crashes, not just recover. Orchestrator isn't there yet, but prompt-level mitigations (EV09b) + modularization (EV13) + session v2 (EV14) will close ~60% of the gap without infrastructure overhaul.

> **Reflexion loops have MEASURABLE impact:** Devin 34% → 67% PR merge rate. Not nice-to-have — must-have.

> **MCP Tasks primitive is coming.** If we design session.json correctly (typed, phased), migration will be smooth when spec stabilizes.
