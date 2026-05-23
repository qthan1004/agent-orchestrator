# Pure Orchestrator Doctrine, Registry, and Harness Boundary Plan

> Date: 2026-05-21
> Type: Architecture alignment plan
> Status: Draft for Phase 2 realignment
> Scope: Doctrine, workspace-local registry, harness boundary, domain routing, done gates

## Core Doctrine

Only the Planner has brain.

The Orchestrator is a pure coordination layer. It does not understand workspace content, task meaning, domain logic, user data, or knowledge files. It only registers identities, owns assignment state, moves state files, enforces locks, spawns/kills workers, receives events, and supports recovery.

The Harness is a runtime wrapper. It reads only the assigned workspace files needed for one task, exposes tool bundles, enforces sandbox rules, calls the model, and reports events back to the server.

The Worker is disposable execution. It receives one task lifetime, uses only injected tools/context/skills, reports result, then forgets.

Knowledge evolution is file-based. Skills, context, reflections, conventions, pitfalls, examples, and checklists are static workspace files for future task lifetimes. They are not hidden memory, server intelligence, model weights, or autonomous cognition.

## Non-Negotiable Boundaries

| Layer | Allowed | Forbidden |
|---|---|---|
| Planner | Interpret intent, decompose tasks, choose strategy, curate workspace knowledge | Write queue internals directly |
| Server | Register workspace/worker/task IDs, lock ownership, move task states, spawn harness, recover from files | Read task body for meaning, scan user content, infer domain strategy, store private data |
| Harness | Load assigned task/context files, expose tools, enforce sandbox, run model loop, callback result | Decompose tasks, mutate strategy, persist knowledge automatically |
| Worker | Execute assigned task, use tools, report result/changelog/blocked reason | Pick new tasks, change task scope, write queue files, keep memory after exit |
| Workspace files | Hold task files, skills, context, exchange state, results, candidates for knowledge update | Become global brain outside explicit Planner/Human promotion |

## Workspace-Local Bootstrap

Root-level `plan/` and `exchange/` are not canonical for real workspaces. They may remain as legacy/demo/dev fixtures, but real workspace runtime state belongs inside the registered workspace.

When a workspace is registered, the server should only receive an explicit path:

```text
register_workspace(path)
```

If `<workspace>/.orchestrator/` is missing, the server bootstraps a template. If it exists, the server reads only registry/state files.

Canonical workspace layout:

```text
<workspace>/.orchestrator/
  registry/
    workspace.json
    workers.json
    tasks.json
  exchange/
    inbox/
    active/
    outbox/
    checkpoints/
    logs/
    signals/
  plans/
    pending/
    processing/
    done/
  skills/
  context/
  results/
```

Server may read/write:

```text
.orchestrator/registry/*.json
.orchestrator/exchange/**
.orchestrator/plans/**
.orchestrator/results/**
```

Server must not read user content outside `.orchestrator/` except when a task path is registered as metadata. Task body is loaded by Harness, not Server.

## Three Identity Registry

The registry is the spine of the system:

| ID | Owner | Meaning |
|---|---|---|
| `workspace_id` | Server creates/validates from registered path | Runtime scope and privacy boundary |
| `worker_id` | Server creates when spawned/registered | Disposable executor identity |
| `task_id` | Planner creates, Server registers | Work unit identity |

Required invariants:

```text
workspace_id exists before any task_id or worker_id
task.workspace_id must equal an active registered workspace
worker.workspace_id must equal an active registered workspace
worker.current_task_id may be null
worker.current_task_id != null => task.assigned_worker_id == worker.id
task.assigned_worker_id != null => worker.current_task_id == task.id
worker owns max 1 active task
task assigned to max 1 worker
closed workspace accepts no new task or worker
server stores task path/status/lock only, not task body
```

## Harness As Independent Module

Harness should be treated like an independent runtime module, closer to tools than to the server.

Suggested boundary:

```text
src/harness/
  index.ts
  runner.ts
  payload.ts
  tool-registry.ts
  workspace-loader.ts
  callback-client.ts
```

Server spawns Harness with an envelope:

```json
{
  "workspace_id": "abc123",
  "worker_id": "w-123",
  "task_id": "T001",
  "workspace_root": "/path/to/workspace",
  "task_file_path": ".orchestrator/exchange/active/task-T001.md",
  "tool_bundle": "generic-file",
  "callback_url": "http://127.0.0.1:3847/api/worker/complete"
}
```

Harness loads task/context/skills inside workspace, prepares prompts, runs tools/model, then reports.

## Domain Routing Hint

Domain detection must not become intelligence.

It is a shallow routing hint:

```text
workspace signals -> domain tags -> tool/skill bundle candidate
```

It may inspect shallow signals such as file extensions, manifest filenames, folder names, and explicit workspace metadata. It must not infer task strategy or read sensitive content for meaning.

If confidence is low, no guessing:

```text
low confidence -> generic-file bundle -> Planner/Human decision required
```

Example output:

```json
{
  "domain_tags": ["spreadsheet", "data-files"],
  "confidence": "medium",
  "evidence": ["*.xlsx", "*.csv"],
  "recommended_tool_bundle": "spreadsheet-basic",
  "needs_planner_decision": true
}
```

## Done Gates

Phase 2 tasks should stop using module-exists as enough evidence. Done requires:

```text
build pass
contract/invariant check pass where relevant
real E2E proof when task touches runtime flow
```

Minimum E2E proof set:

1. Code workspace: Ollama worker edits a tiny file and reports changelog.
2. Data workspace: worker processes dummy CSV/XLSX-like files and writes a report.
3. Low-confidence workspace: routing hint refuses to guess and requests Planner/Human bundle choice.
4. Recovery path: active task can be rebuilt from workspace-local registry/exchange after interruption.

## Task Impact

This plan adds architecture-alignment tasks before later polish:

- P2-33 Pure Orchestrator Doctrine
- P2-34 Workspace Bootstrap Template
- P2-35 Registry Identity Invariants
- P2-36 Harness Module Boundary
- P2-37 Domain Routing Hint Contract
- P2-38 Domain Routing Hint Implementation
- P2-39 Contract E2E Gates
- P2-42 Knowledge Promotion Pipeline

Existing domain detection task is now P2-38 and should be interpreted as domain routing hint, not domain intelligence.

## Approved Knowledge Library

Empty workspaces need a fallback, but fallback must not become hidden intelligence.

Knowledge source priority:

1. Workspace-local skills/context
2. Approved reusable default knowledge repo
3. Generic minimal bundle
4. Planner/Human handoff

The approved default knowledge repo is a curated skill library, not autonomous memory. It may live in Git outside this project and be mounted or referenced during workspace bootstrap/harness setup. The server must not inspect its content for meaning.

Knowledge promotion has three gates:

```text
Worker report/proposal
  -> Planner evaluation
  -> User evaluation
  -> explicit approval
  -> commit/promote to approved knowledge repo or workspace-local knowledge
```

Rules:

- Worker can propose knowledge, not promote it.
- Planner can evaluate usefulness and risk, not silently promote it.
- User approval is required before any reusable/default knowledge is updated.
- Approved knowledge must follow a template/schema.
- Reusable/global defaults are opt-in and versioned in Git.
- Workspace-private data must not be promoted unless explicitly approved and sanitized.
- Server stores no knowledge body, only paths/IDs/status.
