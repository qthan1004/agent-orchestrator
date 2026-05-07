# Workspace Memory — agent-orchestrator

> Last updated: 2026-05-07
> Phase: **Phase 2 — Hybrid Agentic Architecture** (Phase 1 archived)

## Project Overview

- **Name**: agent-orchestrator
- **Version**: 0.3.0-dev (Phase 2)
- **Stack**: Node.js, TypeScript, ESM
- **Module system**: Pure ESM (`import`/`export`)
- **Root**: `D:\workspace\agent-orchestrator`
- **Server port**: 3847

## Architecture

**Server-Centric Unidirectional Data Flow (Head-Body-Limb)**

```
Server (Node.js) → dispatches task → Agent Runner → LLM → tools → report back
```

- Server owns state, schedules work, spawns workers as subprocesses
- Agent Runner is one-shot: stdin → LLM → tools → notify → exit
- Communication: stdin/stdout + HTTP (language-agnostic)
- LLM Harness: `LLMAdapter` interface supports cloud (Gemini) + local (Ollama)

See `.agent/knowledge/architecture-philosophy.md` for design principles.

## Current State

- **Phase 1**: Archived → `_archive/phase1/` (after P2-PRE task completes)
- **Phase 2 tasks**: `tasks/pending/` — 34 tasks (P2-PRE → P2-23 + WM series)
- **Active plan**: `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`
- **Core plan**: `dev-docs/plan_phase2-hybrid-architecture.md`
- **Task board**: `tasks/README.md`

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | Source code (Phase 2 — being rebuilt) |
| `dev-docs/` | Technical docs, active plans |
| `tasks/pending/` | Dev task board |
| `reference/skills/` | Product skills for workers |
| `.agent/` | Dev agent infrastructure (skills, workflows, rules, memory) |
| `plan/` | User plan ingestion (pending → processing → done) |
| `exchange/` | File IPC directories |
| `prompts/` | Agent prompt templates (Phase 2 worker prompts) |

## Key Decisions (Phase 2)

| Decision | Detail |
|----------|--------|
| Language | Node.js/TypeScript (Go migration Phase 3) |
| LLM Harness | Cloud + Local via `LLMAdapter` interface |
| Skills storage | `reference/skills/` (product), `.agent/skills/` (dev) |
| Reflections | Markdown format, global case-bank |
| Case Bank | Global cross-project (`~/.orchestrator/case-bank/`) |
| GPU | RTX 5060 Ti 16GB (Ollama for local models) |

## Build & Dev

```bash
npm run dev          # Development (tsx watch)
npm run build        # TypeScript compile
npm run serve        # Production serve
```

## Don't Touch

- `.agent/skills/` — read-only during task execution
- `reference/` — product assets, not dev artifacts
- `plan/` — user-facing, not dev artifacts
- Architecture decisions without asking first
