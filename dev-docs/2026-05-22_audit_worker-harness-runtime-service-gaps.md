# Audit: Worker Harness Runtime Service Gaps

> Date: 2026-05-23
> Plan-ID: IMEDIALY-worker-harness-service-correction
> Task: IMEDIALY-10-audit-worker-harness-runtime-service-gaps
> Scope: read-only audit before behavior changes

## Summary

Current code already has runtime identity, lease records, heartbeat store, point allocator, and handover state. The remaining gap is that harness readiness, backend service ownership, terminal callbacks, and recovery predicates are still partly process/worker-centric.

The next code boundary should add contracts first, then make runtime service ownership explicit without creating a god `WorkerManager`.

## Hardcoded Ollama Paths

- `src/mcp-server/index.ts` initializes `ollamaBaseUrl` from `OLLAMA_BASE_URL || 'http://localhost:11434'` and starts Ollama before generic runtime setup.
- `src/utils/ollama-launcher.ts` uses a default URL and spawns `ollama serve`.
- `src/runtime-adapters/ollama/constants.ts` defines the shared development URL.
- `src/runtime-adapters/ollama/ollama-runtime.ts` prepares an endpoint but `releaseLease` is still a cleanup stub for private process ownership.
- `src/worker/dispatch-loop.ts` checks only Ollama availability before dispatch and builds the runtime backend as `ollama`.
- `src/harness/runner.ts` creates the harness adapter with `adapter: 'ollama'`.
- `src/worker/model-selector.ts` has a `cloud` profile, but dispatch still routes through the Ollama harness path.

## Silent Or Hidden Harness Phases

- `src/harness/model-loop.ts` writes `.agent/session.json` with `phase: 'implementation'` only.
- `src/harness/runner.ts` logs prompt/model milestones, but there is no ready protocol, callback-send event, cleanup event, or server-accepted lifecycle event.
- `src/worker/process-manager.ts` streams stdout/stderr and emits process heartbeat, but does not prefix every lifecycle line with runtime identity fields.
- `src/mcp-server/tools/session-checkpoint.ts` already defines richer checkpoint phases, but the harness uses only a narrow implementation checkpoint.

## Ready, Callback, And Recovery Gaps

- Ready workflow is absent. `src/runtime/runtime-manager.ts` creates a lease and spawns immediately; `src/worker/dispatch-loop.ts` moves the task active before harness proves payload, task source, backend adapter, model/session, heartbeat, and ready callback acceptance.
- Lease statuses do not yet express canonical `ready`, `running`, `completing`, and `closed`.
- `src/harness/callback-client.ts` sends lease proof, but the callback contract has no explicit terminal state such as `handover_required`.
- `src/mcp-server/index.ts` acknowledges a callback before durable task mutation completes. If mutation fails, monitor logic can see the completion as accepted.
- Legacy MCP `complete_task` in `src/mcp-server/tools.ts` can still mutate task state without `runtime_id + lease_generation`.
- `src/mcp-server/recovery.ts` checks worker heartbeat and process liveness. It does not yet require expired runtime heartbeat, prior health probe, dead runtime service, matching active lease ownership, and no accepted terminal callback.

## Existing Contracts And Stores To Reuse

- `RuntimeIdentity`, `RuntimeBackendProfile`, `RuntimeHeartbeat`: `src/runtime/models.ts`.
- `RuntimeRegistry`, `HeartbeatStore`, `PointAllocator`, `LeaseValidator`: `src/runtime/*`.
- Task state and identity stores: `src/mcp-server/state-manager.ts`, `src/utils/task-identity-registry.ts`, `src/utils/worker-registry.ts`.
- Assignment envelope and runtime identity payload: `src/models/assignment.ts`.
- Infra snapshots and terminal table: `src/infra/resource-monitor.ts`, `src/visibility/resource-terminal-table.ts`.
- Handover record shape: `src/task/models.ts`.

## Smallest Next Boundaries

- IMEDIALY-11: extend contracts only in runtime, harness payload/constants, and visibility models/constants.
- IMEDIALY-12: add terminal lifecycle event output without mutating task/runtime state.
- IMEDIALY-13: add ordered ready workflow and ready callback; keep backend routing unchanged.
- IMEDIALY-14: add `RuntimeServiceManager` and `RuntimeServiceAdapter`; wrap current Ollama path first.
- IMEDIALY-15: dispatch through runtime service manager and key active tracking by `runtime_id + lease_generation`.
- IMEDIALY-16: route backend/model through scheduler payload; keep Ollama first working backend.
- IMEDIALY-17: enforce once-only terminal callback and recovery predicates.
- IMEDIALY-18: treat context succession as `handover_required`, not failure.
- IMEDIALY-19: separate warm model cache policy from lease release.
- IMEDIALY-20: expose Codex CLI and AG CLI runtime service adapters behind the same service boundary.
