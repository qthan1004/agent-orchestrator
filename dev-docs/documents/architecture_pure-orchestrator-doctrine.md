# Pure Orchestrator Doctrine

> Status: Canonical Phase 2 doctrine
> Scope: Planner, Server, Harness, Worker, workspace knowledge boundaries

## Core Rule

Only the Planner has brain.

No other layer may interpret user intent, invent task strategy, learn from workspace content, or keep hidden memory. Every other layer is mechanical and bounded by explicit files, IDs, state transitions, and callbacks.

## Layer Contract

| Layer | Role | Owns | Must Not Do |
|---|---|---|---|
| Planner | Brain | intent, strategy, task decomposition, knowledge evaluation | write queue internals directly, bypass user approval for knowledge promotion |
| Server | Coordinator | identity, registry, task state, locks, dispatch, recovery | read task body for meaning, scan private content, infer domain strategy, call model, store knowledge body |
| Harness | Runtime wrapper | assigned file loading, tool bundle exposure, sandbox, model loop, callback | decompose tasks, change strategy, promote knowledge, keep memory across task lifetimes |
| Worker | Disposable executor | one assigned task execution and report | pick tasks, mutate scope, write queue files, persist memory after exit |
| Workspace files | Static source of truth | task files, skills, context, registry, exchange, results, proposals | act as autonomous memory or global intelligence |

## Planner

Planner is the only decision-making brain.

Planner may:

- interpret user intent
- decompose work into tasks
- choose task strategy
- select or refine tool and skill bundles
- evaluate worker reports
- evaluate knowledge proposals
- ask user for approval

Planner must not:

- directly edit server queue internals
- silently promote reusable knowledge
- bypass workspace privacy boundaries

## Server

Server is dumb coordination.

Server may:

- register `workspace_id`, `worker_id`, and `task_id`
- validate identity invariants
- own task status transitions
- assign one task to one worker
- enforce locks
- spawn and kill Harness processes
- receive callback events
- requeue, block, or complete tasks
- recover state from registry and exchange files

Server must not:

- read user workspace content for meaning
- read task bodies for planning or strategy
- scan workspace files to understand domain meaning
- infer task strategy
- call an LLM
- select knowledge based on content semantics
- store private task body, file body, skill body, or knowledge body
- create tasks from workspace contents

Server stores paths, IDs, status, locks, routing hints, and event metadata only.

## Harness

Harness is an independent runtime wrapper.

Harness may:

- parse the server assignment envelope
- load only the assigned task and selected static context files
- expose the selected tool bundle
- enforce path sandbox rules
- run the model/tool loop
- monitor context usage
- generate handover reports when context is near limit
- call back to the server with completion, failure, progress, or handover events

Harness must not:

- decompose tasks
- pick a new task
- change the Planner's strategy
- widen target file scope
- promote knowledge automatically
- keep hidden memory after its task lifetime
- write queue or registry internals except through server-approved tools or callbacks

## Worker

Worker is disposable execution.

Worker lifetime:

```text
spawn -> receive one assignment -> execute -> report -> exit
```

Worker may:

- use injected context and skills during that lifetime
- use allowed tools
- write inside declared task scope
- report summary, changelog, errors, blocked reason, or proposal

Worker must not:

- remember anything after exit
- fetch arbitrary next tasks
- assign itself work
- modify task ownership
- write runtime queue files directly
- treat previous task context as memory unless it was injected by Planner/Harness

## Workspace Knowledge

Workspace knowledge is file-based and static.

Allowed workspace knowledge:

- skills
- context
- conventions
- examples
- checklists
- pitfalls
- worker proposals
- planner evaluations
- user-approved notes

Workspace knowledge is not:

- hidden model memory
- server intelligence
- autonomous cognition
- model weights
- automatic global learning

Knowledge becomes reusable only through explicit promotion:

```text
Worker proposal
  -> Planner evaluation
  -> User evaluation
  -> explicit approval
  -> workspace-local update or approved default knowledge repo update
```

Private workspace data must stay workspace-local unless the user explicitly approves sanitized promotion.

## Workspace-Local Runtime

Canonical runtime state lives under the registered workspace:

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

Root-level `plan/` and `exchange/` are legacy/demo/dev fixtures only. Real workspace runtime state must use `<workspace>/.orchestrator/`.

Server may read/write only coordination state under `.orchestrator/registry/`, `.orchestrator/exchange/`, `.orchestrator/plans/`, and `.orchestrator/results/`. User content outside `.orchestrator/` belongs to Harness/Worker tools, not Server orchestration logic.

## Recovery Principle

Recovery works because state is file-based and identities are explicit.

Required persisted facts:

- `workspace_id`
- `worker_id`
- `task_id`
- task status
- assignment lock
- active/pending/done location
- retry or respawn count
- handover or checkpoint event metadata

Recovery must rebuild coordination state from registry and exchange files without needing server memory, hidden model memory, or private content analysis.

## Doctrine Test

A design violates this doctrine if it requires any non-Planner layer to answer:

- What does the user really want?
- What strategy should be used?
- What does this private file mean?
- What knowledge should be promoted?
- What task should exist next?

Those questions belong to Planner and Human approval only.
