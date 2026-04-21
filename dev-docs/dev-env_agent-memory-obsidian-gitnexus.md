# Dev-Env: Agent Memory Setup with Obsidian + GitNexus

> **Created**: 2026-04-21
> **Updated**: 2026-04-21
> **Status**: Draft → Phase 0 Started
> **Prefix**: `dev-env_`
> **Scope**: Development environment setup for this repository.
>
> This is **not** a product/runtime implementation plan for `agent-orchestrator`.
> This document records how the development environment can give Codex/agents
> durable memory while working on this repo. Do not store language/framework-
> specific assumptions here; the repo is migrating to TypeScript, so memory must
> stay architecture- and intent-oriented.

## Purpose

Codex and other agents currently need to rediscover the repo every session:
scan files, rebuild the mental model, inspect old plans, and infer conventions
again. The goal of this dev-env setup is to create a small, stable memory layer
so future sessions can start with the right context instead of rereading the
whole repository.

This memory is for developing `agent-orchestrator` itself. It should help an
agent answer: "What is this repo, what matters, what should I avoid breaking,
and where should I look next?"

## Boundary

This setup is separate from the runtime architecture of `agent-orchestrator`.

- `.agent/` is the dev-only local brain for humans and agents working on this
  repository.
- `.agent/workspace-memory.md` is the first file an agent should read at session
  start, when present.
- Obsidian is for human notes, ADRs, session memory, design decisions, and
  durable lessons learned.
- GitNexus or another indexer is for machine-generated structure: symbols,
  dependency graphs, clusters, and impact hints.
- `.agent/knowledge/artifacts/` is for generated/cache artifacts. Agents should
  not read those files by default unless a task needs deeper evidence.

Do not treat this document as a request to change product behavior. It records a
development workflow and memory boundary only.

## Relationship with Other Systems

This dev-env setup is the **first customer** of the product memory tools. Once
`scan_workspace` is built, it replaces manual curation with auto-generation.

| System | Scope | Relationship |
|--------|-------|-------------|
| **This doc** (dev-env) | Setup memory for THIS repo | Consumer — uses tools when ready |
| **`plan_local-rag`** | Build `scan_workspace` MCP tool | Builder — provides auto-generation |
| **`plan_evolution`** | Agent behavior + recovery protocol | Builder — provides GEMINI.md, session checkpoint |
| **Antigravity KIs** (`~/.gemini/antigravity/knowledge/`) | Cross-conversation memory per user | Complementary — KIs supplement workspace-memory |
| **GEMINI.md** | Agent behavior instructions | Dependency — must instruct agent to read workspace-memory |

**Priority for agents**: workspace-memory.md (workspace context) → KIs
(conversation history) → full-repo discovery (fallback).

## Proposed Layout

```text
.agent/
  workspace-memory.md              ← NEW: front door for agents
  rules/                           ← NEW: agent behavior rules
    dev-memory-protocol.md
    ts-migration-boundary.md
  knowledge/                       ← EXISTS
    architecture-philosophy.md
    artifacts/                     ← NEW subdirectory
      file-map.json
      git-context.json
      gitnexus-summary.json
  skills/                          ← EXISTS (folder-convention, safe-deletion, strict-scope)
  workflows/                       ← EXISTS (pick-task, push-git, save-bug-report, save-plan)
  tools/                           ← EXISTS
  obsidian-vault/                  ← NEW (optional, see decision below)
    00-index.md
    architecture/
    decisions/
    sessions/
```

`workspace-memory.md` should be curated and compact. It is the front door for
agents. Obsidian notes can be richer and more conversational. Artifacts can be
regenerated and should be treated as cache/index data.

### Decision: Obsidian Vault Location

**Recommended**: External vault path (via env var `OBSIDIAN_VAULT_PATH`), NOT
inside `.agent/`. Reasons:

- Vaults grow large → bloats git history.
- Multiple contributors would create merge conflicts on vault files.
- Obsidian works best with its own root directory.

Keep a lightweight `.agent/obsidian-vault/00-index.md` pointer file that
references the external vault location, so agents know where to look.

## Memory Policy

Store durable context:

- Architecture intent and non-negotiable principles.
- Module responsibilities and cross-module contracts.
- Decisions that explain why the repo works this way.
- Current workstreams and migration boundaries.
- Pointers to the most relevant docs, not copies of entire files.

Avoid storing:

- Language-specific assumptions that may become stale during the TypeScript
  migration.
- Temporary command output or one-off debugging notes.
- Full source dumps.
- Runtime/product action plans unless they are clearly linked as references.

## Startup Protocol

At the start of a development session, an agent should:

1. Read `.agent/workspace-memory.md` if it exists.
2. Read only the docs linked from memory that are relevant to the task.
3. Avoid full-repo discovery unless memory is missing, stale, or insufficient.
4. When learning something durable, add it to the appropriate memory layer:
   Obsidian for human reasoning, workspace memory for compact agent guidance,
   artifacts for generated index data.

## Getting Started (Phase 0 — Manual Setup)

Before product tools (`scan_workspace`) are ready, bootstrap memory manually:

### Step 1: Create workspace-memory.md

Create `.agent/workspace-memory.md` with curated content covering:

- Project identity (name, type, stack, entry point)
- Architecture principles (Head-Body-Limb, file-based IPC, DAG queue)
- Key directories and their purposes
- Current migration state (ESM → TypeScript)
- Active dev plans with links
- Non-negotiable rules and what NOT to touch

See `.agent/workspace-memory.md` for the live file (created alongside this doc).

### Step 2: Verify

Start a new agent session → verify the agent reads workspace-memory.md →
measure if there are fewer grep/view_file calls in the first 5 minutes.

### Step 3 (future): Auto-generate

When `scan_workspace` tool is built (see `plan_local-rag-gitnaxus-obsidian.md`),
replace manual memory with auto-generated version. This repo becomes the first
test case for that product feature.

## Naming Convention

- `dev-env_*`: setup, tooling, memory, and workflow around the development
  environment for this repo.
- `plan_*`: action plans that change product/runtime behavior or codebase
  implementation.
- `research_*`: research notes, tool comparisons, feasibility analysis, and
  background investigation.

This prefix prevents dev-environment memory work from being confused with
runtime implementation plans.

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Memory stale → agent uses wrong context | High | Add `last_updated` timestamp; agent checks freshness |
| Agent does NOT read memory (no instruction) | High | GEMINI.md must reference workspace-memory.md |
| Memory too long → wastes context window | Medium | Cap at ~200 lines; use pointers not full content |
| Obsidian vault bloats git | Medium | External vault path (decided above) |
| Memory contradicts actual code | Medium | Review memory when making architectural changes |

## Open Follow-ups

Dev-env scope (resolve here):

- Decide how to mark memory freshness without coupling it to the current
  JavaScript-to-TypeScript migration state.
- Define a lightweight review cadence for workspace-memory.md (e.g., monthly,
  or after each major refactor).

Product scope (tracked in their respective plans):

- Auto-generate workspace-memory.md → see `plan_local-rag-gitnaxus-obsidian.md`
- GitNexus bridge for structural intelligence → see `plan_local-rag-gitnaxus-obsidian.md` §2
- GEMINI.md creation and agent prompt update → see `plan_evolution-and-local-brain.md` Phase 1
