# Research: 2026 Agent Memory Systems & RAG Assessment

> **Date:** 2026-05-02
> **Type:** Research + Assessment
> **Status:** Completed
> **Scope:** Agent memory landscape 2026 (Devin Wiki, Claude CLAUDE.md/Auto Memory, Cursor .cursor/rules/, Mem0, Cognee, Letta/MemGPT) + review of `plan_local-rag-gitnaxus-obsidian.md`

---

## 1. The "Context is NOT Memory" Paradigm (2026)

> **Industry consensus:** Larger context windows ≠ memory. Context is a buffer. Memory is persistent, structured, evolving knowledge.

### Memory Tiers — 2026 Standard

| Layer | Analogy | Implementation |
|-------|---------|----------------|
| **Working Memory** | RAM | Context window (200K–1M tokens) |
| **Episodic Memory** | Event log | Session logs, checkpoints, conversation history |
| **Semantic Memory** | Knowledge DB | Knowledge graphs, workspace-memory, CLAUDE.md |
| **Procedural Memory** | Skills | SKILL.md, workflows, playbooks |

---

## 2. Top Memory Systems — 2026

### Devin Wiki
- **Auto-indexes** connected repos in background
- Generates architecture diagrams, module relationships, data flow maps
- **Devin Search**: NL questions about codebase ("Which endpoints handle auth?")
- **Deep Mode**: Extended exploration for complex queries
- **Cross-session retention**: Remembers previous decisions

### Claude Code CLAUDE.md + Auto Memory
- **CLAUDE.md**: Manual rules, hierarchical loading (global → project → local)
- **Auto Memory**: Agent self-writes learnings. Machine-local, per-git-repo
- `/init` command: Auto-generates starter from codebase
- **Modular**: `.claude/rules/*.md` for topic-specific rules

### Cursor .cursor/rules/
- **MDC files** (Markdown Configuration) with frontmatter:
  - `alwaysApply: true` = inject every interaction
  - `globs: "src/**/*.ts"` = scope to file patterns
  - Agent-selected = AI decides relevance
- **MCP memory**: Cross-session persistent data via MCP server config

### Mem0
- Read-Write personalized long-term memory
- Agent stores/retrieves structured facts
- Memory decay for relevance management
- Rich metadata: timestamps, project scope, tags

### Cognee
- Dynamic knowledge graphs from unstructured data
- Typed relationships (not just embeddings)
- Relational queries: "What depends on X?"

### Letta / MemGPT
- OS-inspired tiered memory architecture
- Auto-promotes/demotes info between tiers
- Manages fixed context windows intelligently

---

## 3. Assessment: Our RAG Plan vs 2026

### What's correct

| RAG Plan Feature | 2026 Equivalent | Verdict |
|------------------|-----------------|---------|
| "Intelligence lives in workspace" | CLAUDE.md, .cursor/rules/, AGENTS.md | ✅ Industry standard |
| Dumb scanner, smart file | Curated injection pattern | ✅ Best practice |
| Multi-source fusion (structure + git + human) | Comprehensive | ✅ Advanced |
| Guard clauses (skip if exists) | Token-efficient | ✅ Good pattern |
| GitNexus structural intelligence | Knowledge graph | ✅ Beyond what Claude/Cursor do natively |

### 5 Gaps identified

| # | Gap | Current | 2026 Standard | Fix |
|---|-----|---------|----------------|-----|
| 1 | **Read-only memory** | Agent reads, cannot write | Claude Auto Memory: agent self-writes | Add `update_memory` MCP tool |
| 2 | **Flat markdown output** | Top-down text | Knowledge graph + relational output | Enhanced relationship formatting |
| 3 | **Agent Feedback Loop** | Listed as "Future" | Claude Auto Memory does this by DEFAULT | Elevate to current phase |
| 4 | **Full re-scan only** | Regenerate entirely | Incremental / continuous background | Diff-based incremental update |
| 5 | **Obsidian coupling** | External dependency | Human knowledge IN workspace | Deprioritize — use GEMINI.md, .agent/skills/ |

### Comparison Table

| Feature | Our RAG Plan | 2026 State-of-Art |
|---------|-------------|-------------------|
| Memory type | Read-only file | Read-Write persistent (Mem0, Claude Auto Memory) |
| Knowledge structure | Flat markdown | Knowledge graph + markdown (Devin Wiki, Cognee) |
| Agent can learn | ❌ No write-back | ✅ Self-updating |
| Update strategy | Full re-scan | Incremental / continuous (Devin Wiki background) |
| Human knowledge | Obsidian vault | In-workspace files (CLAUDE.md, .cursor/rules/) |
| NL query | ❌ Agent reads file | ✅ "Ask Devin" / Deep Mode |
| Cross-session learning | ❌ Each scan = fresh | ✅ Agent accumulates knowledge over time |

---

## 4. Proposed: "Agent Memory Stack" (3-tier)

```
Tier 1 — Static Knowledge (scan_workspace output)
  workspace-memory.md
  ├── Project Overview (auto-generated)
  ├── File Map (auto-generated)
  ├── Architecture Relationships (auto-generated, enhanced with co-change)
  └── Dependency Graph (auto-generated)
  → Read by agent at session start

Tier 2 — Dynamic Knowledge (agent-written)
  workspace-memory.md (append section)
  └── ## Agent Learnings
      - "tools.ts and state-manager.ts always change together" [learned: EV08]
      - "npm run build requires clean dist/ first" [learned: EV05]
  → Written by agent via update_memory tool

Tier 3 — Procedural Knowledge (human + agent curated)
  .agent/skills/         ← How to do things
  .agent/workflows/      ← Step-by-step procedures
  GEMINI.md              ← Project rules (= our CLAUDE.md)
  → Read on-demand by reference
```

---

## 5. Recommendations

| # | Change | Priority | Effort |
|---|--------|----------|--------|
| 1 | Add `update_memory` MCP tool (read-write) | 🔴 P0 | S |
| 2 | Enhanced relationship output in workspace-memory | 🟡 P1 | XS |
| 3 | Elevate "Agent Feedback Loop" from Future → Current | 🟡 P1 | S |
| 4 | Incremental diff-based scan | 🟡 P1 | M |
| 5 | Deprioritize Obsidian bridge | 🟢 P2 | XS |
| 6 | NL search over workspace (Devin Search-like) | 🔮 Future | L |

### Suggested new EV tasks

| Task | Description | Depends on |
|------|-------------|------------|
| **EV-MEM01** | `update_memory` MCP tool — agent write-back | EV09b |
| **EV-MEM02** | Enhanced relationship output in workspace-memory template | scan_workspace exists |
| **EV-MEM03** | Incremental diff-based scan_workspace | scan_workspace exists |

---

## 6. Key Insight

> **Single highest-impact enhancement:** Add `update_memory` MCP tool (~50 LOC).
> This upgrades workspace-memory from "read-only snapshot" to "living, agent-managed knowledge base" — matching 2026 industry standard with minimal effort.
