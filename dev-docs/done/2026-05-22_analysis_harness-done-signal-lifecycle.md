# Analysis: Harness Done-Signal Lifecycle

> Date: 2026-05-22
> Scope: dispatch loop, harness callback, one-shot shutdown

## Problem

The current task lifecycle can loop forever when a task is active but the server
never receives an accepted harness completion signal.

The unsafe behavior is treating process exit as proof of completion. A harness
process can exit with code 0 after a failed or rejected callback because the
callback client only logs notification failures. In that case the task file
stays in `active/`, the queue never drains, and one-shot mode keeps waiting.

There is a second loop risk on explicit harness failure: the HTTP completion
path requeues failed tasks without applying the task retry ceiling.

## Required Contract

The done signal is the server-accepted harness callback, not process exit.

Lifecycle:

1. Server moves one dispatchable task from `inbox/` to `active/`.
2. Server registers a disposable worker and spawns one independent Harness
   process for that task.
3. Harness loads the assigned task, runs the model loop, and waits for the
   model to call the in-harness `complete_task` tool.
4. Harness posts `/api/worker/complete`.
5. Server validates ownership, performs the state transition, and returns an
   accepted response.
6. Only after that accepted response may the Harness exit normally.
7. Dispatch loop closes/reclaims that Harness process and unloads its model.

Rules:

- A clean process exit without an accepted callback is a failure for that task
  attempt.
- A non-zero process exit after an accepted callback must not requeue the task;
  the server already processed the terminal signal.
- Timeout or crash before accepted callback requeues the task until
  `maxTaskRetries`, then moves it to outbox as `failed`.
- One task owns one harness lifetime. Finishing one task closes only that
  harness lifetime.

## Fix Direction

- Make the callback client fail hard when the server does not return an
  accepted completion response.
- Track accepted harness callbacks in the dispatch loop.
- Monitor each spawned harness independently.
- Requeue or permanently fail a task when a harness exits without an accepted
  callback.
- Apply the same retry ceiling in the HTTP completion failure path.

## Follow-Up: Active Orphan Startup Gap

Observed on 2026-05-22:

- `harness-smoke-01` existed in `.orchestrator/exchange/active/`.
- `tasks.json` still had an `assigned_worker_id`.
- `workers.json` was empty.
- `/health` reported `dispatch_loop = running` and `active_workers = 0`.

The server restored a clean shutdown and kept the task as `active`, so the
dispatch loop never selected it. Recovery must release active tasks with no
owning worker on every startup, not only after an unclean shutdown. Runtime
monitoring should do the same check so an orphaned active task cannot sit
forever while no harness process exists.

Also observed: `D:\workspace\Oschestrator test` and
`D:\workspace\Oschestrator test\` produced different workspace IDs. Workspace
paths must be normalized before `workspace_id` generation.
