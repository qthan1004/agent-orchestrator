# Worker, Harness, Runtime Service Architecture Analysis

> Date: 2026-05-22
> Type: Canonical architecture analysis
> Status: Active reference
> Supersedes archived docs:
> - `dev-docs/done/2026-05-22_analysis_harness-centric-architecture-gap.md`
> - `dev-docs/done/2026-05-22_plan_worker-as-service-node.md`
> - `dev-docs/done/2026-05-21_guide_dev-start-workspace-register-harness.md`
> - `dev-docs/done/2026-05-21_guide_dev-start-workspace-register-harness.vi.md`

## Summary

The root issue is architectural, not a timeout bug.

The system must be built around this boundary:

```text
Worker = Harness instance
Model/CLI = backend execution engine
RuntimeLease = proof that one task attempt owns one execution right
RuntimeService = live service instance created for one active runtime lease
```

The model or CLI never talks to the server. Only the Harness talks to the server.

## Root Cause

The current execution path still mixes these concepts:

- task state
- worker identity
- process state
- runtime lease
- backend health
- heartbeat
- callback acceptance
- recovery
- handover

When these concepts collapse, the server cannot prove whether an active task belongs to a live isolated harness service or a dead/stale worker record.

The old symptom map is still valid:

| Symptom | Root cause |
|---|---|
| Silent terminal during cold start | ready/progress events have no ownership boundary |
| Task stuck in active | task state is not tied tightly enough to runtime lease identity |
| Late callback can mutate task | callback identity lacks or bypasses lease proof |
| Shared Ollama breaks parallel points | hidden shared backend state is treated as worker isolation |
| Recovery can guess wrong | stale time is treated as proof instead of a trigger for verification |
| CLI adapters cannot fit cleanly | dispatch path is Ollama-centric, not Harness-centric |

## Vocabulary Lock

| Term | Meaning | Not Meaning |
|---|---|---|
| `TaskReady` | task is dispatchable and scheduler may consider it | harness has started |
| `Worker` | one Harness instance spawned by the server | model, Ollama daemon, CLI brain |
| `Harness` | server-facing execution wrapper | backend model itself |
| `RuntimeLease` | ownership proof for one task attempt | process handle only |
| `RuntimeService` | live service instance while one runtime lease is active | singleton, always-on daemon, worker pool |
| `HarnessService` | Harness side of a runtime service | separate permanent domain owner |
| `BackendAdapter` | backend-specific mechanics | task state owner |
| `Model/CLI` | execution engine behind Harness | server client |

Canonical hierarchy:

```text
Server
  -> RuntimeLease
    -> Worker/Harness instance
      -> BackendAdapter
        -> Model / CLI / API
```

## Core Invariant

One task attempt owns exactly one runtime lease. One runtime lease owns exactly one live service instance.

```text
task_attempt_id
-> runtime_id + lease_generation
-> worker_id / harness instance
-> backend_session_id / process / endpoint
-> heartbeat record
-> point reservation
```

Every server-facing signal must include:

```text
task_id
worker_id
runtime_id
lease_generation
backend
backend_session_id when available
```

If the signal lacks lease proof, it must not mutate task state.

## State Owners

| Domain | Owns | Does Not Own |
|---|---|---|
| `TaskStore` | task state and task transitions | backend health |
| `Scheduler` | task/backend/model/point decision | spawn/kill/process |
| `RuntimeManager` | lease lifecycle orchestration | backend internals |
| `RuntimeRegistry` | lease records | process probing |
| `HeartbeatStore` | liveness timing per runtime lease | reclaim decision |
| `PointAllocator` | reserve/release points by runtime lease | backend spawn |
| `RuntimeServiceManager` | live service handles for active leases | task mutation |
| `Harness` | server protocol: ready, heartbeat, progress, complete, fail, handover | scheduling |
| `BackendAdapter` | spawn/ready/probe/kill/cleanup for one backend | task state |
| `RecoveryManager` | reclaim decision after explicit proof | normal dispatch |
| `Visibility` | terminal lifecycle/resource reporting | state mutation |

`WorkerManager` must not replace `RuntimeManager`.

If `WorkerManager` exists, it may only be a compatibility facade for old `worker_id` APIs. The architecture truth remains:

```text
RuntimeManager + RuntimeRegistry + HeartbeatStore + PointAllocator + RuntimeServiceManager
```

## Correct Dispatch Flow

The owner-defined flow:

```text
task ready
-> server pulls/locks task
-> scheduler chooses backend/model by difficulty, points, verified capacity
-> server creates runtime lease
-> server spawns harness service with task path and runtime identity
-> harness ready workflow passes
-> harness loads task details
-> harness works with backend model/CLI/tools
-> harness sends terminal callback with report
-> server validates callback by lease identity
-> server accepts result
-> server closes harness and removes runtime identity
```

State machine split:

```text
Task: ready -> dispatching -> active -> done / failed / requeued
Lease: created -> spawning -> ready -> running -> completing -> closed
Harness: spawned -> ready -> working -> reporting -> exited
```

Key rule:

```text
TaskReady means server may create lease.
HarnessReady means lease can start execution.
Terminal callback accepted means lease can close.
```

## Harness Ready Mini Workflow

`ready` is a workflow, not a boolean.

```text
1. process spawned
2. payload parsed
3. runtime identity verified
4. task source reachable
5. backend adapter initialized
6. model/session reachable
7. heartbeat registered
8. ready callback accepted by server
```

Only after all checks pass:

```text
lease.status = ready
lease.status = running
harness starts work
```

If any step fails:

```text
ready_failed(step, reason)
-> server kills harness
-> release points
-> close heartbeat
-> mark lease failed
-> requeue task with reason
```

Ready event shape:

```ts
interface HarnessReadyEvent {
  event: 'harness_ready';
  task_id: string;
  worker_id: string;
  runtime_id: string;
  lease_generation: number;
  backend: RuntimeBackend;
  backend_session_id?: string;
  checks: Array<{
    name: string;
    ok: boolean;
    reason?: string;
  }>;
  ready_at: string;
}
```

## Harness Boundary

The model or CLI backend never talks to the server.

Allowed:

```text
Harness -> Server: ready
Harness -> Server: heartbeat
Harness -> Server: progress
Harness -> Server: complete/fail/handover
Harness -> BackendAdapter -> Model/CLI/API
Model/CLI/API -> Harness
```

Forbidden:

```text
Model/CLI -> Server API
Model/CLI -> MCP complete_task
Model/CLI -> register_worker
Model/CLI -> report_progress
```

The old MCP worker tools should be deprecated for worker usage first. Do not remove them as part of the runtime-service refactor unless a separate migration task owns that compatibility break.

Harness must not be silent.

The user must be able to see what the harness is doing and where it is stuck. This is a terminal protocol requirement, not a UI requirement.

At minimum, the user should see a normal CLI-like terminal:

```text
server terminal
  -> prefixed harness stdout/stderr
  -> prefixed backend/CLI stdout/stderr when available
  -> lifecycle/progress lines emitted by Harness wrapper
```

This means raw useful output is streamed line-by-line, not hidden until task end.

Minimum harness stream:

```text
spawn requested
process spawned
payload parsed
identity verified
task source loaded
backend selected
backend starting
backend ready
model/session call started
tool call started/ended
context usage checkpoint
handover preparing/submitted
callback sending
callback accepted/rejected
cleanup started/ended
```

For CLI backends, stdout may be quiet. Harness must still emit heartbeat/progress events from the wrapper:

```text
CLI process alive
elapsed time
last stdout/stderr timestamp
current phase
current task_id/runtime_id/lease_generation
```

Silence is only allowed for a bounded interval shorter than the health-check lead window. After that, Harness must emit an explicit "still alive" event or Recovery must treat it as suspicious and probe.

## Runtime Service Lifecycle

A `RuntimeService` exists only while one runtime lease is active.

```text
create lease
-> reserve points
-> spawn service
-> run ready workflow
-> mark running
-> monitor heartbeat/progress
-> accept terminal callback, context succession, or recover
-> stop service
-> release points
-> remove heartbeat
-> close lease
```

Not this:

```text
singleton service
always-on daemon
worker pool waiting idle
module owner that replaces runtime lease
```

Future prewarm support must introduce separate terms:

```text
PrewarmedService = idle backend capacity
RuntimeLeaseBinding = one task attempt owns service for one lease
```

This is not needed for the current architecture lock.

## Backend Adapter Contract

Backend-specific work must sit behind an adapter. This prevents spray-and-pray cleanup.

```ts
interface RuntimeServiceAdapter {
  readonly backend: RuntimeBackend;
  healthCheck(): Promise<boolean>;
  estimateCapacity(input: CapacityEstimateInput): RuntimeCapacityEstimate;
  spawn(input: RuntimeServiceSpawnInput): Promise<RuntimeServiceHandle>;
  waitReady(handle: RuntimeServiceHandle): Promise<RuntimeReadyResult>;
  isAlive(identity: RuntimeIdentity): Promise<boolean>;
  kill(identity: RuntimeIdentity): Promise<void>;
  cleanup(identity: RuntimeIdentity): Promise<void>;
}

interface RuntimeServiceHandle {
  runtime_identity: RuntimeIdentity;
  backend_session_id?: string;
  pid?: number;
  endpoint_url?: string;
  completion: Promise<RuntimeServiceOutcome>;
}
```

Adapter responsibilities:

| Backend | Adapter owns |
|---|---|
| `ollama` | private endpoint/process when isolated; shared fallback is dev-only and single-worker |
| `codex-cli` | one CLI process/session per runtime lease |
| `ag-cli` | one CLI process/session per runtime lease |
| `gemini-api` | one request/session lineage per runtime lease |

## Capacity Rule

Capacity must come from infra verification, not hardcoded machine assumptions.

Capacity dimensions:

```text
points
worker_slots
backend_slots
vram_mb
ram_mb
cpu_threads
context_tokens
rate_limit_bucket
warm_cache_key
warm_cache_ttl_ms
```

Runtime/model profiles may provide estimates. `PointAllocator` compares estimates against verified capacity before a lease starts.

Shared Ollama fallback:

```text
isolation = shared-dev-fallback
max local parallelism = 1
```

True local parallelism requires separate runtime leases with explicit endpoint/process ownership.

VRAM cache is an infra optimization, not an ownership source.

```text
RuntimeLease owns execution right.
WarmModelCache owns reusable loaded weights/cache capacity.
Task state never lives in VRAM cache.
```

The scheduler may prefer a successor lease that can reuse a warm model cache, but callback/recovery validation still uses `runtime_id + lease_generation`.

## Heartbeat And Stale Timing

There is one stale truth per runtime lease.

Heartbeat record must store:

```text
last_seen_at
stale_at
last_health_check_at
next_health_check_at
health_state
```

Timing invariant:

```text
stale_at = last_seen_at + stale_threshold_ms
next_health_check_at <= stale_at - health_check_lead_ms
last_health_check_at updates every time a check runs
```

Stale is not proof of death. Stale only triggers verification.

## Callback Validation

Terminal callback is accepted only if:

```text
task_id matches active task
worker_id matches active lease owner
runtime_id matches active lease
lease_generation matches active lease
task is active
runtime lease is active/running/completing
terminal callback was not already accepted
```

Late callbacks from old `runtime_id` or `lease_generation` must be rejected before task mutation.

## Recovery Predicate

Recovery may reclaim only when all are true:

```text
heartbeat expired
AND last health probe ran before stale_at
AND process/session/backend is dead
AND task still owns same runtime_id + lease_generation
AND no accepted terminal callback exists
```

Recovery must not reclaim from stale time alone.

## Handover Pipeline

Handover is task transition state, not shared memory.

```text
service A -> Harness callback carries handover
server validates A lease identity
server stores handover by task_id + runtime_id + lease_generation
scheduler selects service B for next attempt
server injects only matching handover into B assignment
late handover from A old generation is rejected
```

Minimum handover record:

```ts
interface WorkerServiceHandoverRecord {
  task_id: string;
  worker_id: string;
  runtime_id: string;
  lease_generation: number;
  attempt: number;
  order: number;
  summary: string;
  open_questions: string[];
  modified_files: string[];
  next_action: string;
  content: string;
  created_at: string;
}
```

## Context Succession Protocol

Near-context exhaustion is not a crash. It is a planned succession event.

Small local models may approach context limits before a task is done. Harness must detect this early and preserve task continuity through a validated handover.

Supported modes:

| Mode | Owner | Default | Meaning |
|---|---|---|---|
| `server_respawn` | Server | yes | current harness writes handover, closes lease, server spawns successor lease |
| `self_rotate` | Harness | no | harness rotates backend session under same lease when adapter explicitly supports it |

Default mode is `server_respawn`.

```text
context usage near limit
-> harness pauses normal work
-> harness asks model to write succession note
-> harness validates required handover fields
-> harness sends `handover_required` terminal callback
-> server validates runtime_id + lease_generation
-> server stores handover
-> server closes current lease as `closed_for_successor`
-> scheduler creates next lease_generation
-> scheduler prefers warm cache when capacity allows
-> server spawns successor harness with handover payload
-> successor harness continues task
```

`handover_required` is not `failed`.

```text
running
-> handover_preparing
-> handover_submitted
-> closed_for_successor
```

Minimum succession note:

```text
task goal
current progress
files touched
exact next action
open questions
known risks
commands/checks already run
context summary
do-not-repeat notes
warm_cache_preference: backend + model + cache key when known
```

If the model cannot produce a valid succession note:

```text
handover_prepare_failed
-> server treats as retryable failure
-> recovery can requeue using last logs/checkpoints
```

`self_rotate` is allowed only when the adapter can prove all of this:

```text
same runtime_id + lease_generation remains active
heartbeat continues during rotation
point reservation remains held
old backend session cannot emit stale callback
new backend session receives validated succession note
terminal callback still comes from Harness
```

VRAM/cache rule:

```text
release execution lease != blindly unload warm model cache
```

For local models, adapter cleanup should support a short warm-cache grace window when capacity allows:

```text
lease closes
-> task ownership released
-> backend session stopped or rotated
-> warm model cache may stay reserved by cache policy for successor
-> cache evicted by TTL, pressure, or scheduler decision
```

This avoids a dumb OS-style loop where every near-context succession unloads and reloads the same local model.

## Visibility

Silent terminal is an architecture smell. It hides the lifecycle boundary.

Terminal visibility must show:

```text
queue state
lease created
points reserved
harness spawned
ready workflow step
backend/model/session ready
current harness phase
heartbeat/progress
last stdout/stderr time for CLI backends
context usage and succession threshold
callback send
callback accepted/rejected
recovery checks
resource snapshot: VRAM/RAM/CPU/backend health/loaded models
```

Visibility reads state. It does not mutate lifecycle state.

## Current Code Gaps To Verify

As of this analysis, these are the critical gaps to keep checking during implementation:

| Gap | Expected correction |
|---|---|
| dispatch still health-checks only Ollama | scheduler/router checks selected backend |
| dispatch hardcodes Ollama backend | backend decision comes from scheduler |
| harness runner hardcodes Ollama adapter | payload drives backend adapter |
| runtime cleanup kills multiple adapters defensively | adapter cleanup uses lease backend |
| `WorkerManager` language can collapse domains | prefer `RuntimeServiceManager` or facade-only `WorkerManager` |
| ready is treated as process spawn | ready becomes mini workflow |
| near-context exhaustion looks like failure/crash | Harness emits planned context succession |
| local model cache gets unloaded on every succession | cache policy separates lease cleanup from warm model eviction |
| harness terminal is silent | Harness emits lifecycle/progress events from wrapper, including quiet CLI sessions |
| old worker MCP tools imply worker talks to server | only Harness emits server-facing signals |

## Non-Goals For This Refactor

- no UI resource monitor; terminal table only
- no always-on worker pool
- no Docker requirement yet
- no MCP tool removal in the runtime-service refactor
- no hardcoded local VRAM or fixed worker count as scheduling truth

## Canonical Sentence

```text
Task owns work.
RuntimeLease owns execution right.
Worker equals Harness instance.
RuntimeService exists only while that lease is active.
Harness owns server protocol.
BackendAdapter owns model/CLI mechanics.
Model/CLI never talks to server.
Harness must show its current phase; silent execution is not acceptable.
```
