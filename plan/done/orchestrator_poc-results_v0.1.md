# POC Results: Agent Orchestrator v0.1

> **Test Date**: 2026-04-04
> **Test Plan**: `test_hello-orchestrator_v0.1.md`
> **Test Script**: `tests/e2e-flow.mjs`

## ✅ What Worked

1. **MCP Session Init** — Streamable HTTP transport initializes correctly, session ID returned
2. **Worker Registration** — `register_worker` returns unique UUID (`w-XXXXXXXX`)
3. **Empty Queue Check** — `get_queue_status` correctly reports `total: 0` on fresh start
4. **Task Decomposition** — `submit_decomposition` accepts valid DAG with 3 tasks, 2 groups
5. **Queue Population** — After decomposition, queue shows `total: 3, pending: 3`
6. **Task Execution Loop** — `get_next_task` → `report_progress` → `complete_task` cycle works
7. **DAG Ordering** — Task `03-verify-all` (group 2, depends on group 1) correctly only becomes available after both `01-create-hello` and `02-update-readme` complete
8. **File Flow** — inbox → active → outbox: files move correctly across directories
9. **Result JSONs** — `result-XX.json` in outbox contain valid `{task_id, status, summary, worker_id, completed_at}`
10. **Checkpoint** — `checkpoints/checkpoint-*.json` saved after each task completion, contains full serialized queue state
11. **Logging** — `exchange/logs/YYYY-MM-DD.md` contains full chronological event history

### Execution Order Verified
```
01-create-hello → 02-update-readme → 03-verify-all
```
Task 03 (group 2) correctly waited for both group 1 tasks.

## ❌ What Failed

Nothing critical. All 11 test steps passed.

## 🟡 Gaps Discovered

1. **workers.json stale state** — After `complete_task`, the worker's `current_task` is cleared in memory but `workers.json` on disk still shows the last assigned task and `tasks_completed: 2` instead of 3. The worker registry doesn't flush to disk after each mutation; it only writes on registration.

2. **Log file appends across sessions** — The log file accumulates entries from all server sessions in the same day. Previous test/recovery sessions appear mixed in. This is correct behavior but makes post-analysis slightly noisy.

3. **No `plan load` CLI command** — The task spec mentioned `node src/index.mjs plan load ...` but this doesn't exist. Decomposition was done via MCP tool call directly. The CLI is serve-only.

4. **Worker `tasks_completed` counter** — The counter increments in `tools.mjs` `complete_task` handler and correctly tracks within a session, but resets on server restart (in-memory only).

## 📊 Token Cost Analysis

### MCP Tool Call Overhead (estimated per call)

| Tool | Input Tokens (est.) | Output Tokens (est.) |
|------|---------------------|----------------------|
| `register_worker` | ~30 | ~20 |
| `get_queue_status` | ~20 | ~40 |
| `submit_decomposition` | ~200 | ~15 |
| `get_next_task` | ~30 | ~30 |
| `report_progress` | ~50 | ~10 |
| `complete_task` | ~60 | ~30 |
| `get_checkpoint` | ~20 | ~25 |

### Full Flow Breakdown (3 tasks)

| Phase | Calls | Est. Total Tokens |
|-------|-------|-------------------|
| Init + Register | 2 | ~70 |
| Queue check | 1 | ~60 |
| Decompose | 1 | ~215 |
| Execute 3 tasks | 9 (3×get + 3×progress + 3×complete) | ~540 |
| Final verify | 2 | ~105 |
| **Total** | **15** | **~990** |

### Per-Task Coordination Overhead

- **~180 tokens per task** (get_next + report_progress + complete_task)
- Below the 200-300 estimate ✅
- Decomposition is a one-time cost (~215 tokens) amortized across all tasks

## 📋 Next Steps (v0.5)

1. **Fix workers.json persistence** — Flush worker state to disk after `complete_task`
2. **Add `tasks_completed` persistence** — Include in checkpoint or workers.json
3. **CLI commands** — Add `plan load`, `status`, `reset` subcommands
4. **Real Agent Integration** — Test with actual Antigravity agent reading SKILL.md protocol
5. **Multi-worker test** — Parallel workers picking tasks from same queue
6. **Error handling E2E** — Test `failed` and `blocked` status paths
7. **Checkpoint restore E2E** — Crash mid-flow, restart, verify seamless continuation
