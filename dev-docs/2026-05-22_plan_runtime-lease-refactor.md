# Runtime Lease Refactor Plan

> Date: 2026-05-22
> Scope: technical mindset, module boundaries, runtime isolation, scheduler points, hybrid local/CLI workers
> Implementation status: IMEDIALY-00 through IMEDIALY-08 implemented as structure/runtime boundary refactor; IMEDIALY-09 closes docs/task-board alignment and stops this plan.

## Implementation Addendum

Implemented architecture now has:

- domain public APIs for `runtime`, `task`, `scheduler`, `infra`, and `visibility`
- runtime lease records, heartbeat store, point allocator, capacity store, lease validator, and runtime manager
- callback identity threading with `task_id`, `worker_id`, `runtime_id`, and `lease_generation`
- server rejection for late or stale completion/handover callbacks that do not match the active runtime lease
- infra verifier and terminal resource table; server only wires snapshot collection to renderer output
- Ollama runtime adapter boundary with isolated endpoint resolution when enabled and explicit shared dev fallback capped at one local worker
- Codex CLI and AG CLI runtime adapter boundaries, with scheduler route contracts for CLI backend pools
- structured per-service handover records stored on task transition state, not global shared memory

## Correction Summary

The observed failure is not only a timeout bug. It is an ownership bug.

Current code still lets task lifecycle, worker lifecycle, process lifecycle, backend health, retry policy, and callback acceptance live too close together. That makes the system unable to prove whether an active task belongs to a live isolated runtime or to a dead worker record.

The refactor must restore the original product idea:

```text
n local workers for small tasks
n CLI workers for large tasks
same time
point-aware
capacity-verified
lease-isolated
```

Without isolated runtime leases, point-based parallel scheduling is false confidence.
Without verified infra capacity, local scheduling is a hardcoded machine guess.

## Technical Mindset

The orchestrator is not a shared model queue. It is a resource-aware runtime scheduler.

Core invariant:

```text
1 active task -> 1 runtime lease -> 1 backend runtime/session -> 1 point reservation
```

Parallelism is valid only when the scheduler can allocate independent runtime leases. Shared backend daemons are dev fallback only; they do not satisfy worker isolation.

Server responsibilities:

- own queue state, dependencies, target file locks, point budgets, runtime leases
- consume verified infra capacity before reserving local runtime leases
- route tasks to backend pools
- validate callbacks by task, worker, runtime, and lease generation
- reclaim tasks only after explicit liveness signals prove the runtime is dead

Server must not:

- own backend internals
- share hidden execution state between workers
- treat process exit as task success
- reclaim a task from heartbeat expiry alone
- mix task state, runtime lifecycle, scheduler policy, and backend code in one module
- treat one shared Ollama daemon as multiple isolated workers
- treat stale timing as the source of truth for ownership
- hardcode GPU model, VRAM size, context window, or worker count as scheduling truth

Harness responsibilities:

- execute one assigned runtime lease
- use the backend adapter assigned by the server
- report completion/failure/handover through the callback contract
- exit after the server accepts the terminal signal

Backend adapter responsibilities:

- local Ollama: private Ollama endpoint per runtime lease when isolation is enabled; shared daemon is dev-only fallback capped at one worker
- Codex CLI: private CLI process/session per runtime lease
- AG CLI: private CLI process/session per runtime lease

Infra verifier responsibilities:

- detect local runtime capacity
- publish verified capacity profile
- refresh capacity before scheduling and during health checks
- stay separate from scheduler policy

Visibility responsibilities:

- show lifecycle progress for user-facing terminals/log streams
- show infra resource snapshots in a terminal table
- report spawn, backend start, model call, tool call, callback send, callback accepted, health check, retry, and reclaim events
- read state from runtime/task domains; do not mutate lifecycle state
- defer UI until explicitly requested

## Target Module Layout

```text
src/
  task/
    index.ts
    models.ts
    constants.ts
    task-state-store.ts
    task-locks.ts

  runtime/
    index.ts
    models.ts
    constants.ts
    runtime-registry.ts
    runtime-manager.ts
    heartbeat-store.ts
    point-allocator.ts
    lease-validator.ts

  infra/
    index.ts
    models.ts
    constants.ts
    infra-verifier.ts
    resource-monitor.ts
    capacity-store.ts

  runtime-adapters/
    ollama/
      index.ts
      models.ts
      constants.ts
      ollama-runtime.ts
    codex-cli/
      index.ts
      models.ts
      constants.ts
      codex-runtime.ts
    ag-cli/
      index.ts
      models.ts
      constants.ts
      ag-runtime.ts

  scheduler/
    index.ts
    models.ts
    constants.ts
    task-router.ts
    dispatch-loop.ts

  visibility/
    index.ts
    models.ts
    constants.ts
    lifecycle-reporter.ts
    resource-terminal-table.ts

  harness/
    index.ts
    models.ts
    constants.ts
    runner.ts
    callback-client.ts
    tool-registry.ts

  recovery/
    index.ts
    models.ts
    recovery-manager.ts
```

Follow the local library pattern:

- `index.ts` is public API only
- `models.ts` owns contracts
- `constants.ts` owns immutable values and text
- helpers are pure functions
- managers coordinate, not own unrelated domains

## Canonical Contracts

Backend choices:

```ts
export type RuntimeBackend = 'ollama' | 'codex-cli' | 'ag-cli';
export type RuntimeIsolation = 'isolated' | 'shared-dev-fallback';
```

Verified infra capacity:

```ts
export interface VerifiedInfraCapacity {
  provider: 'local-gpu' | 'local-cpu' | 'cli' | 'cloud';
  total_vram_mb?: number;
  available_vram_mb?: number;
  total_ram_mb?: number;
  available_ram_mb?: number;
  max_local_runtimes: number;
  supported_backends: RuntimeBackend[];
  checked_at: string;
}
```

Runtime capacity estimate:

```ts
export interface RuntimeCapacityEstimate {
  backend: RuntimeBackend;
  model?: string;
  estimated_vram_mb?: number;
  requested_context_tokens?: number;
  points_required: number;
}
```

Infra resource snapshot:

```ts
export interface InfraResourceSnapshot {
  checked_at: string;
  uptime_seconds: number;
  dispatch_loop: 'running' | 'stopped';
  queue: InfraQueueSnapshot;
  active_workers: InfraWorkerSnapshot[];
  capacity?: VerifiedInfraCapacity;
  ollama: InfraOllamaSnapshot;
  vram: InfraVramSnapshot;
  ram: InfraMemorySnapshot;
  cpu: InfraCpuSnapshot;
}
```

Visibility rule:

```text
infra/resource-monitor collects snapshots
visibility/resource-terminal-table renders snapshots
server only wires snapshot -> terminal output
```

Runtime identity:

```ts
export interface RuntimeIdentity {
  runtime_id: string;
  worker_id: string;
  task_id: string;
  lease_generation: number;
}
```

Runtime lease:

```ts
export interface RuntimeLease extends RuntimeIdentity {
  backend: RuntimeBackend;
  isolation: RuntimeIsolation;
  points_reserved: number;
  status: RuntimeStatus;
  started_at: string;
  stale_at: string;
}
```

Heartbeat:

```ts
export interface RuntimeHeartbeat extends RuntimeIdentity {
  last_seen_at: number;
  stale_at: number;
  last_health_check_at: number;
  next_check_at: number;
  health_state: RuntimeHealthState;
}
```

Worker-service handover:

```ts
export interface WorkerServiceHandoverRecord {
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

Handover source is the current runtime lease. Handover target is the next runtime lease chosen by scheduler/allocator. Late handover with old `runtime_id` or `lease_generation` is rejected before task mutation.

Callback validation:

```text
accepted only if:
task_id matches
worker_id matches
runtime_id matches
lease_generation matches
task is active
runtime lease is active
```

Recovery reclaim:

```text
reclaim only if:
heartbeat expired
AND runtime process/session dead
AND task still owns same runtime_id + lease_generation
```

Stale and health timing:

```text
stale_at = last_seen_at + stale_threshold_ms
next_check_at = stale_at - health_check_lead_ms
health_check_lead_ms is derived from the same stale threshold
last_health_check_at updates every time a check runs
```

Rules:

- one stale threshold per runtime lease
- no per-class private stale truth
- heartbeat/health check runs before expiry
- stale only triggers verification
- verification reads runtime manager/process session before reclaim

Visibility event:

```ts
export interface LifecycleEvent extends RuntimeIdentity {
  event: LifecycleEventName;
  message: string;
  at: string;
}
```

Messages belong in `visibility/constants.ts`, not inline lifecycle logic.

## Current Root Cause Map

| Symptom | Root Cause | Correct Owner |
|---|---|---|
| Silent terminal during cold start | harness/runtime progress has no reporting boundary | `visibility/` |
| Active task can survive without live worker | task state is not tied to runtime lease identity | `runtime/lease-validator.ts` + `task/` |
| Heartbeat and stale checks drift | timing lives in separate classes | `runtime/heartbeat-store.ts` |
| Recovery can guess from stale state | stale is treated like proof, not signal | `recovery/recovery-manager.ts` |
| Shared Ollama breaks parallel points | backend process is shared hidden state | `runtime-adapters/ollama/` |
| Callback can arrive late | callback lacks lease generation proof | `runtime/lease-validator.ts` |
| Plan assumes one machine size | scheduler reads hardcoded VRAM instead of verified capacity | `infra/` + `runtime/point-allocator.ts` |
| User cannot see resource monitor | monitor data has no terminal visibility surface | `infra/resource-monitor.ts` + `visibility/resource-terminal-table.ts` |

## Type Rules

- Use one representation per concept.
- Use `enum` only when runtime enum semantics are required.
- Use string unions for closed compile-time choices.
- Shared interfaces must have base types and explicit extensions.
- Do not redeclare the same shape in multiple files.
- Do not store task bodies in registries.

## Constants Rules

- No class-local magic numbers.
- No inline user-facing text, log text, or error text in logic.
- Domain text belongs in domain `constants.ts`.
- Timing and limits belong in config or lifecycle constants.
- Classes receive config and collaborators; they do not invent policy.

## Refactor Plan

### Phase 0: Freeze Adapter Expansion

Goal: stop adding backend behavior to the current mixed modules.

Actions:

- Do not add Codex CLI or AG CLI adapters yet.
- Keep current lifecycle patches as guardrails only.
- Use current `dispatch-loop` as behavior reference.

Verify:

- existing build still passes
- no new backend-specific logic enters server/recovery

### Phase 1: Normalize Contracts And Constants

Goal: create stable domain contracts without changing behavior.

Actions:

- Add `src/runtime/models.ts`.
- Add `src/runtime/constants.ts`.
- Add `src/infra/models.ts`.
- Add `src/infra/constants.ts`.
- Add `src/task/models.ts`.
- Add `src/scheduler/models.ts`.
- Add `src/visibility/models.ts`.
- Add `src/visibility/constants.ts`.
- Add terminal resource table renderer under `src/visibility/`.
- Move duplicated runtime/task callback shapes into shared models.
- Move lifecycle text and timing labels out of class bodies.
- Add one canonical `RuntimeBackend` and `RuntimeIsolation` type.
- Add one canonical `VerifiedInfraCapacity` contract.

Verify:

- TypeScript compiles
- imports point to domain models
- no duplicated task/runtime identity interface remains
- no new inline lifecycle message text remains in moved code
- no scheduling docs/code depend on a hardcoded VRAM size
- infra resource output appears as a terminal table, not UI

### Phase 2: Introduce RuntimeRegistry, HeartbeatStore, PointAllocator

Goal: separate counting/state from dispatch loop and read verified capacity before lease allocation.

Actions:

- Add `CapacityStore` fed by infra verifier.
- Add `RuntimeRegistry` keyed by `runtime_id`.
- Add `HeartbeatStore` keyed by `runtime_id`.
- Add `PointAllocator` keyed by `runtime_id`.
- Keep existing worker process behavior but write through the new stores.
- Store `last_seen_at`, `stale_at`, `last_health_check_at`, and `next_check_at` per runtime lease.
- Make `PointAllocator` compare runtime estimates against verified capacity.

Verify:

- one active task has one runtime record
- heartbeat map has one entry per runtime
- point reservation releases on completion/failure/timeout
- health check always runs before `stale_at`
- allocator rejects local runtime plans that exceed verified available capacity

### Phase 3: Add Lease Generation

Goal: reject late and stale callbacks.

Actions:

- Add `runtime_id` and `lease_generation` to assignment payload.
- Add both fields to harness callback.
- Validate callback against current active runtime lease.
- Reject callbacks from old lease generations.
- Emit visibility events for callback send, reject, and accept.

Verify:

- late callback after requeue is rejected
- callback from current runtime is accepted
- task cannot be completed by worker without matching runtime lease
- user terminal shows current lifecycle stage

### Phase 4: Split RuntimeManager From Scheduler

Goal: make dispatch loop policy-only.

Actions:

- Move spawn/kill/health logic out of `dispatch-loop`.
- Introduce `RuntimeManager` interface:

```ts
interface RuntimeManager {
  spawn(lease: RuntimeLease, payload: HarnessPayload): Promise<SpawnedRuntime>;
  kill(runtime_id: string): Promise<void>;
  isAlive(runtime_id: string): boolean;
}
```

- Dispatch loop only asks allocator/router/manager.
- RuntimeManager owns runtime process/session health checks.

Verify:

- dispatch loop no longer imports backend adapters directly
- recovery probes runtime manager, not worker process details

### Phase 5: Implement Isolated Local Ollama Runtime

Goal: local small tasks get true runtime isolation.

Actions:

- Spawn one private `ollama serve` per local runtime on a private port.
- Pass `ollama_base_url` through payload.
- Harness uses payload base URL, not global env.
- Kill private Ollama process on terminal runtime state.
- Keep shared Ollama only as `shared-dev-fallback` with `maxConcurrentWorkers = 1`.
- Derive local runtime count, context, and model choice from verified capacity.

Verify:

- two local runtimes use different ports
- worker A cannot complete worker B task
- unloading/killing runtime A does not touch runtime B lease
- Qwen 4B and Qwen 7B can run together only when capacity allocator grants two leases
- no fixed local VRAM number is required for scheduling

### Phase 6: Add CLI Runtime Adapters

Goal: support high-point tasks through Codex CLI and AG CLI.

Actions:

- Add `runtime-adapters/codex-cli`.
- Add `runtime-adapters/ag-cli`.
- Route by priority, points, backend capacity, and task profile.
- Keep adapter process/session lifecycle behind `RuntimeManager`.

Verify:

- small tasks route to local pool
- high-point tasks route to CLI pool
- local and CLI runtimes can run at the same time

### Phase 7: Recovery Rewrite

Goal: recovery reads signals and validates leases before mutation.

Actions:

- Recovery reads task state, runtime registry, heartbeat store, runtime manager.
- Recovery reclaims only when heartbeat expired and runtime is dead.
- Recovery always verifies `runtime_id + lease_generation` before moving task.

Verify:

- active live runtime is not reclaimed
- dead runtime task requeues once
- late completion cannot release another runtime's points

## Plan Update

The current Phase 2 plan should be interpreted with this correction:

```text
Worker = runtime lease, not just process.
Backend = adapter-owned execution environment, not server-owned model client.
Parallelism = multiple valid runtime leases, not multiple requests to shared backend.
```

Shared Ollama may remain as a dev-only single-worker fallback, but it cannot be used for production parallel scheduling or point-based isolation.

Update the core Phase 2 plan with this addendum before adapter expansion, so future tasks do not continue the shared-backend mindset.
