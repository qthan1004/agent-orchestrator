# Task IMEDIALY-02: Refactor Runtime Lease Stores

## Info
- **ID:** IMEDIALY-02-refactor-runtime-lease-stores
- **Module:** runtime registry, heartbeat store, point allocator, capacity store
- **Group:** Immediate Runtime Lease Refactor
- **Dependencies:** IMEDIALY-01
- **Priority:** 0
- **Plan-ID:** IMEDIALY-runtime-lease-refactor
- **Plan-Order:** 02
- **Plan-Next:** IMEDIALY-03-refactor-scheduler-runtime-split.md
- **Ref:** `dev-docs/2026-05-22_plan_runtime-lease-refactor.md`

## Constraints

- Store ownership only. Do not add Codex/AG adapters.
- Stale is signal, not proof.
- Heartbeat entries must be keyed by runtime/lease id.
- Point reservations must be keyed by runtime lease.

## What to do

Introduce state owners:

- `RuntimeRegistry`
- `HeartbeatStore`
- `PointAllocator`
- `CapacityStore`
- `LeaseValidator` shell if needed

Existing dispatch/process flow may write through these stores, but do not rewrite routing yet.

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | `src/runtime/*` |
| NEW/MODIFY | `src/infra/*` |
| MODIFY | `src/worker/dispatch-loop.ts` only as needed to write through stores |
| MODIFY | `src/worker/process-manager.ts` only as needed to emit runtime/heartbeat data |

## Verification

```bash
npm run typecheck
npm run build
```

## Done Criteria

- [x] One active runtime record per active task attempt
- [x] Heartbeat store tracks `last_seen_at`, `stale_at`, `last_health_check_at`, `next_health_check_at`
- [x] Point allocator reserves/releases by runtime lease
- [x] Capacity store reads verified capacity, not hardcoded GPU/VRAM truth
- [x] Existing behavior remains buildable
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

### Plan Continuation

After this task is completed and moved to `tasks/done/`, call `/pick-task` again.

Expected next task in this plan: `IMEDIALY-03-refactor-scheduler-runtime-split.md`.

Do not pick tasks outside `Plan-ID: IMEDIALY-runtime-lease-refactor` until this plan reaches `STOP`.
