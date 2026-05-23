---
name: Module Boundary Discipline
description: Always-on architecture discipline for this repository. Read before changing code, plans, models, constants, lifecycle logic, scheduler logic, runtime/harness code, or TypeScript module structure.
---

# Module Boundary Discipline

Use this skill before any code or architecture work in this repository. It reflects the IMEDIALY-00 through IMEDIALY-09 runtime lease architecture and the IMEDIALY worker/harness runtime-service correction chain.

## Activation Gate

This skill is mandatory before changing code, plans, models, constants, lifecycle logic, scheduler logic, runtime/harness code, recovery code, or TypeScript module structure.

Before writing, first identify:

1. Root cause, not symptom.
2. Domain owner.
3. State owner.
4. Identity used to prove ownership.
5. Contract that rejects stale or late signals.

Do not patch a timeout, heartbeat, log, or retry path until the owner and identity model are clear.

## Single Responsibility

One module owns one responsibility.

- Loop code only loops and delegates.
- Task code only owns task state and task transitions.
- Runtime code owns lease lifecycle orchestration, runtime registry, heartbeat records, point reservations, and runtime service handles.
- Heartbeat code only records liveness by runtime/lease id.
- Scheduler code only decides what can run now.
- Recovery code only decides whether a lease can be reclaimed after reading explicit signals.
- Backend adapters own backend-specific spawn, ready, probe, kill, and cleanup for one backend.
- Harness code owns server protocol for one assigned runtime lease: ready, heartbeat, progress, complete, fail, and handover callbacks.
- Visibility code only reports current lifecycle progress and resource snapshots.

If a file owns multiple domains, stop and split or add a narrow seam before adding behavior.

Do not create a god `WorkerManager`. If compatibility needs that name, keep it as a facade only; the ownership model remains `RuntimeManager + RuntimeRegistry + HeartbeatStore + PointAllocator + RuntimeServiceManager`.

## Folder Shape

Prefer small domain folders with public API exports, like:

```text
src/<domain>/
  index.ts
  models.ts
  constants.ts
  helpers.ts
  <domain>-store.ts
  <domain>-manager.ts
```

Use deeper folders only when the domain has real subdomains:

```text
src/runtime-adapters/ollama/
  index.ts
  models.ts
  constants.ts
  ollama-runtime.ts
```

Rules:

- `index.ts` exports public API only.
- `models.ts` contains interfaces/types for that domain.
- `constants.ts` contains immutable values and text for that domain.
- `helpers.ts` contains pure functions only.
- Managers orchestrate collaborators; they do not own unrelated policy.
- Root-level shared files may exist only for truly shared contracts. Prefer domain folders.

## Types

- Use `enum` when runtime enum semantics are needed.
- Use string union types for closed compile-time choices.
- Do not mix enum, object constants, and raw string literals for the same concept.
- Shared shapes must have a base interface and explicit extensions.
- Do not duplicate interfaces across files.
- Split model files when an interface points to a separate domain.
- Keep names explicit: `RuntimeLease`, `RuntimeIdentity`, `RuntimeHeartbeat`, `TaskState`, `SchedulerDecision`.
- Do not use `Worker` as a catch-all for task, runtime, process, harness, and backend.
- In current architecture, `Worker` means one server-spawned Harness/runtime lease instance. It does not mean model, Ollama daemon, CLI brain, backend pool, or task state.
- Backend means adapter-owned execution service/session behind the harness.

Preferred pattern:

```ts
export interface RuntimeIdentity {
  runtime_id: string;
  worker_id: string;
  task_id: string;
  lease_generation: number;
}

export interface OllamaRuntimeIdentity extends RuntimeIdentity {
  backend: 'ollama';
  ollama_base_url: string;
}
```

## Constants And Text

Constants are constants. Do not hide immutable values inside classes.

- No magic numbers in class bodies.
- No user-facing text, log text, error text, or repeated strings inline in logic.
- Put text in domain `constants.ts`.
- Put timing, limits, statuses, and labels in config/constants.
- A class may read constants, not invent them.
- Log/error/message text belongs in named constants such as `RUNTIME_MESSAGES` or `TASK_MESSAGES`.
- Status values belong in one type source. Do not repeat string literals across domains.

## Lifecycle Invariant

Do not collapse task, worker, runtime, and heartbeat into one concept.

- `task_id` identifies work.
- `worker_id` identifies the server-spawned Harness instance for one runtime lease.
- `runtime_id` identifies one execution lease.
- `lease_generation` rejects late callbacks.
- `backend_session_id` or endpoint/process id identifies adapter-owned backend session when available; it is not task ownership.
- Heartbeat entries are keyed by runtime/lease id, not global state.
- Points are reserved and released by runtime lease.
- One active task attempt owns exactly one runtime lease.
- One runtime lease owns exactly one live runtime service instance.
- One runtime service instance owns exactly one Harness instance.
- One Harness instance talks to exactly one backend adapter selected by payload/scheduler.
- One runtime lease owns exactly one backend runtime/session or request lineage.
- One runtime lease owns exactly one point reservation.
- One runtime lease owns exactly one heartbeat record.
- A shared Ollama daemon is not worker isolation. It is only a dev fallback.
- Worker-service handover is task transition state scoped to the current `task_id + runtime_id + lease_generation`, not shared memory.
- Handover belongs to the current runtime lease and may be injected only into the next lease chosen by scheduler/allocator.

Canonical hierarchy:

```text
Server
  -> RuntimeLease
    -> Worker/Harness instance
      -> BackendAdapter
        -> Model / CLI / API
```

State machine split:

```text
Task: ready -> dispatching -> active -> done / failed / requeued
Lease: created -> spawning -> ready -> running -> completing -> closed
Harness: spawned -> ready -> working -> reporting -> exited
```

`TaskReady` means scheduler may create a lease. `HarnessReady` means ready workflow passed and the lease can run. Accepted terminal callback means the lease can close.

Recovery may reclaim a task only when:

```text
heartbeat expired
AND last health probe ran before stale_at
AND runtime service/process/session is dead
AND task still owns same runtime_id + lease_generation
AND no accepted terminal callback exists
```

## Stale And Health Timing

There is one stale truth per runtime lease.

- Store `last_seen_at`, `stale_at`, `last_health_check_at`, and `next_health_check_at` in the heartbeat/lease record.
- Compute health checks from that record, not from per-class private stale timers.
- Health check or heartbeat must run before lease expiry: `next_health_check_at <= stale_at - lead_ms`.
- Refresh `last_health_check_at` every time the health check runs.
- Never reclaim from stale time alone. Stale only asks recovery to verify service/process/session death.

## Isolation Rule

Parallel scheduling is valid only when runtime leases are independent.

- Local small task: isolated Ollama runtime/endpoint per lease.
- Shared Ollama fallback is dev-only and capped to one local Worker/Harness instance.
- Large/high-point task: isolated Codex CLI or AG CLI runtime/session per lease.
- Multiple workers sharing one hidden backend state breaks point-based scheduling.
- Running Qwen 4B and Qwen 7B together requires separate runtime leases with explicit capacity accounting.

## Infra Capacity Rule

Do not hardcode local machine capacity.

- Infra verification owns actual hardware/runtime capacity.
- Scheduler consumes a verified capacity profile.
- Runtime/model profiles declare estimates, not truth.
- PointAllocator compares requested capacity against verified available capacity.
- No fixed VRAM baseline, fixed GPU name, fixed context window, or fixed worker count should decide scheduling.
- Docs may show example model estimates only when labeled as examples.

## Resource Visibility Rule

Do not build a UI for resource monitoring unless explicitly requested.

- Infra/resource code collects snapshots.
- Visibility code renders snapshots.
- Server code only wires collection to output.
- Current visibility target is a terminal table.
- Terminal table must show queue, active workers, backend health, loaded models, VRAM, RAM, and CPU load.
- Visibility reads runtime/task/infra state and emits terminal output. It must not assign tasks, mark leases ready/running, accept callbacks, release points, or requeue work.
- Harness/runtime visibility must report spawn, ready step, backend start, model/tool progress, heartbeat/progress, context handover, callback send/accept/reject, cleanup, health check, retry, and reclaim.
- Quiet CLI backends still need wrapper progress with `task_id`, `runtime_id`, `lease_generation`, backend, and current phase.

## Harness And Backend Boundary

- Harness is the server-facing execution wrapper.
- Model, CLI, API, or Ollama daemon never talks to the server directly.
- Harness receives runtime identity and backend choice from payload.
- Harness creates or calls the adapter selected by payload, not a hardcoded global backend path.
- Backend adapter owns backend mechanics only: spawn, ready/probe, session health, kill, cleanup, endpoint/session details.
- Runtime manager owns lease orchestration and delegates backend mechanics to runtime service adapter.
- Runtime service exists only while one runtime lease is active; it is not a singleton, idle pool, or always-on worker daemon.

Allowed:

```text
Harness -> Server: ready / heartbeat / progress / complete / fail / handover
Harness -> BackendAdapter -> Model / CLI / API
Model / CLI / API -> Harness
```

Forbidden:

```text
Model / CLI / API -> Server API
Model / CLI / API -> MCP complete_task
Model / CLI / API -> register_worker
Model / CLI / API -> report_progress
```

## Ready Workflow Rule

Ready is an ordered workflow, not a boolean and not process spawn.

Ready checks must cover:

```text
process spawned
payload parsed
runtime identity verified
task source reachable
backend adapter initialized
model/session reachable
heartbeat registered
ready callback/event accepted by server
```

Server must not mark a lease running until ready workflow passes. Ready failure must emit failed step and reason, kill the harness/service, release points, close heartbeat, mark lease failed, and requeue task when policy says retry.

## Runtime Service Adapter Rule

- Use a narrow `RuntimeServiceAdapter` boundary for backend-specific mechanics.
- Adapter registry/lookup is by backend selected by scheduler/payload.
- Current Ollama path should be wrapped through the adapter boundary first.
- Do not expand Codex/AG behavior while fixing Ollama service boundaries unless the task explicitly asks.
- Do not use spray-and-pray cleanup. Cleanup must target the active lease backend/session.
- Process exit alone is not task success. Accepted terminal callback is the done signal.

## Backend Routing Rule

- Scheduler returns backend/model/capacity estimate.
- Dispatch checks selected backend health, not global Ollama health before every route.
- Payload carries backend profile, runtime identity, and adapter/session data needed by the harness.
- Harness reads backend from payload.
- Verified capacity is checked before local lease allocation.
- Current Ollama remains the first working backend path, but code should not encode Ollama as the only possible path.

## Handover Rule

- Handover source is the current runtime lease/session.
- Handover target is the next runtime lease selected by scheduler/allocator.
- Handover records must include `task_id`, `worker_id`, `runtime_id`, `lease_generation`, attempt/order, summary, open questions, modified files, and next action.
- Late handover from an old runtime id or lease generation must be rejected before task mutation.
- Context succession handover is planned lease succession, not task failure, when the harness emits a validated handover callback.
- Default succession mode is server respawn: current lease writes handover, server validates and closes it for successor, scheduler creates the next lease, and only matching handover is injected.
- Warm model cache is an infra optimization only. It never owns task state or callback authority.

## Callback And Recovery Rule

- Every server-facing terminal signal must include `task_id`, `worker_id`, `runtime_id`, and `lease_generation`.
- Terminal callback is accepted at most once.
- Completion, failure, and handover must be rejected if runtime identity does not match active lease.
- Late callback must not mutate task state or release another lease's points.
- Recovery must verify expired heartbeat, prior health probe, dead service/process/session, same active `runtime_id + lease_generation`, and no accepted terminal callback.
- Stale time only triggers verification. It is not death proof.

## Review Gate

Before editing, answer:

1. Which domain owns this behavior?
2. Is this module doing exactly one job?
3. Does an existing model/constant/helper already own this concept?
4. Will this change mix task state, runtime lease, backend execution, or recovery?
5. Are callback and recovery paths protected by runtime identity and lease generation?
6. Does user visibility show what lifecycle step is running without changing ownership?
7. Does capacity come from infra verification rather than a hardcoded machine assumption?
8. Is resource display terminal-first and separate from infra measurement?
9. Does `Worker` mean Harness/runtime lease instance, not model or backend?
10. Does backend-specific spawn/ready/probe/kill/cleanup stay behind an adapter?
11. Does ready workflow pass before the lease runs?
12. Does handover apply only to the current runtime lease and scheduler-selected successor?

If any answer is unclear, inspect code or ask before coding.
