---
name: Module Boundary Discipline
description: Always-on architecture discipline for this repository. Read before changing code, plans, models, constants, lifecycle logic, scheduler logic, runtime/harness code, or TypeScript module structure.
---

# Module Boundary Discipline

Use this skill before any code or architecture work in this repository.

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
- Runtime code only owns execution leases, backend sessions/processes, and lifecycle.
- Heartbeat code only records liveness by runtime/lease id.
- Scheduler code only decides what can run now.
- Recovery code only decides whether a lease can be reclaimed after reading explicit signals.
- Backend adapters only know how to run one backend.
- Visibility code only reports current lifecycle progress.

If a file owns multiple domains, stop and split or add a narrow seam before adding behavior.

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
- `worker_id` identifies logical worker ownership.
- `runtime_id` identifies one execution lease.
- `lease_generation` rejects late callbacks.
- Heartbeat entries are keyed by runtime/lease id, not global state.
- Points are reserved and released by runtime lease.
- One active task owns exactly one runtime lease.
- One runtime lease owns exactly one backend runtime/session.
- One runtime lease owns exactly one point reservation.
- One runtime lease owns exactly one heartbeat record.
- A shared Ollama daemon is not worker isolation. It is only a dev fallback.
- Worker-service handover is task transition state scoped to `task_id + runtime_id + lease_generation`, not shared memory.

Recovery may reclaim a task only when:

```text
heartbeat expired
AND runtime process is dead
AND task still owns same runtime_id + lease_generation
```

## Stale And Health Timing

There is one stale truth per runtime lease.

- Store `last_seen_at`, `stale_at`, `last_health_check_at`, and `next_health_check_at` in the heartbeat/lease record.
- Compute health checks from that record, not from per-class private stale timers.
- Health check or heartbeat must run before worker expiry: `next_health_check_at <= stale_at - lead_ms`.
- Refresh `last_health_check_at` every time the health check runs.
- Never reclaim from stale time alone. Stale only asks recovery to verify process/session death.

## Isolation Rule

Parallel scheduling is valid only when runtime leases are independent.

- Local small task: isolated Ollama runtime/endpoint per lease.
- Shared Ollama fallback is dev-only and capped to one local worker.
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

## Handover Rule

- Handover source is the current runtime lease/session.
- Handover target is the next runtime lease selected by scheduler/allocator.
- Handover records must include `task_id`, `worker_id`, `runtime_id`, `lease_generation`, attempt/order, summary, open questions, modified files, and next action.
- Late handover from an old runtime id or lease generation must be rejected before task mutation.

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

If any answer is unclear, inspect code or ask before coding.
