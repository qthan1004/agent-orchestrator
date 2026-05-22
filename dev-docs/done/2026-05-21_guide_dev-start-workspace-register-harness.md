# Dev Start Guide: Workspace Register + Harness Smoke Test

> Date: 2026-05-21
> Scope: local dev startup after `register_workspace` and harness boundary split

## Goal

Start the orchestrator in dev, connect a workspace through the MCP `register_workspace`
adapter, submit one workspace-local task, and confirm the server spawns the Harness.

This guide uses the current single-workspace runtime. The workspace passed to
`register_workspace` must match the workspace path selected when the server starts.

## Vocabulary

| Term | Meaning |
|---|---|
| Server tool | Internal server-side function/module. It can be called by MCP adapters, CLI, Docker entrypoint, or future HTTP routes. |
| MCP tool | Thin MCP-exposed adapter. It should validate MCP input shape, call a server tool, then format MCP output. |
| Workspace connector | Server tool at `src/server-tools/workspace-connector.ts`. Owns connect/register/bootstrap logic. |
| `register_workspace` | MCP tool that calls the workspace connector. Use this before submitting tasks. |
| `register_worker` | MCP tool for agent/worker identity. It also reuses the workspace connector, but should not be the primary workspace init API. |

## Current Startup Contract

Server startup is still interactive:

```bash
npm run build
npm run serve
```

When prompted:

```text
? Configuration (default/custom) [default]:
```

Use `default` to use the repo root as the workspace, or `custom` to provide an
absolute workspace path.

Important:

- The server dispatch loop is configured for exactly one workspace at startup.
- `register_workspace(workspace_path)` must use that same path.
- If you want another workspace, restart the server and choose that path.
- The worker process manager spawns `dist/harness/index.js`, so build before serving.

## Step 1: Start Server

From repo root:

```bash
npm run build
npm run serve
```

For a first smoke test, choose default and confirm the current repo path.

Expected server-side effects:

```text
<workspace>/.orchestrator/
  registry/
  exchange/
  plans/
  skills/
  context/
  results/
```

## Step 2: Connect Workspace Through MCP

In your MCP client, call:

```json
{
  "tool": "register_workspace",
  "args": {
    "workspace_path": "D:\\workspace\\agent-orchestrator"
  }
}
```

Expected response shape:

```json
{
  "workspace_id": "<8-char-id>",
  "workspace_root": "D:\\workspace\\agent-orchestrator",
  "workspace_name": "agent-orchestrator",
  "status": "active",
  "orchestrator_root": "D:\\workspace\\agent-orchestrator\\.orchestrator",
  "dispatch_enabled": true,
  "server_root": "D:\\workspace\\agent-orchestrator",
  "contract_mode": "workspace-first"
}
```

Keep `workspace_id` for `submit_task`.

## Step 3: Create A Smoke Task File

Create this file in the connected workspace:

```text
.orchestrator/tasks/harness-smoke.md
```

If `.orchestrator/tasks/` does not exist yet, create that directory manually for
this smoke test. The current bootstrap layout does not create it yet, but
`submit_task` accepts task files anywhere under `.orchestrator/`.

File content:

```markdown
---
task_id: harness-smoke-01
action: implement
priority: 1
target_files:
  - tmp/harness-output.txt
---

# Harness Smoke Test

Goal: create `tmp/harness-output.txt`.

Write exactly this content:

Harness boundary smoke test passed.

Done criteria:
- `tmp/harness-output.txt` exists
- file content matches the exact expected sentence
- call `complete_task` with a changelog
```

## Step 4: Submit Task Through MCP

Call:

```json
{
  "tool": "submit_task",
  "args": {
    "task_id": "harness-smoke-01",
    "workspace_id": "<workspace_id from register_workspace>",
    "task_content_path": ".orchestrator/tasks/harness-smoke.md"
  }
}
```

Expected response:

```json
{
  "status": "registered",
  "task_id": "harness-smoke-01",
  "target_files_count": 1,
  "depends_on_count": 0
}
```

Expected file movement:

```text
.orchestrator/exchange/inbox/task-harness-smoke-01.json
  -> .orchestrator/exchange/active/task-harness-smoke-01.json
  -> .orchestrator/exchange/outbox/task-harness-smoke-01.json

.orchestrator/exchange/outbox/result-harness-smoke-01.json
```

## Step 5: Confirm Harness Ran

Watch server logs for:

```text
[DispatchLoop] Starting hybrid task dispatch loop...
[w-...] Worker spawned
```

The process being spawned should be the Harness entrypoint:

```text
dist/harness/index.js
```

Check workspace output:

```powershell
Get-Content tmp\harness-output.txt
Get-ChildItem .orchestrator\exchange\outbox
Get-Content .orchestrator\exchange\outbox\result-harness-smoke-01.json
```

Pass condition:

- `tmp/harness-output.txt` exists.
- result JSON exists in `.orchestrator/exchange/outbox/`.
- task status is `done`.
- result summary/changelog came back through `/api/worker/complete`.

## Troubleshooting

### `Workspace mismatch`

Cause: server was started with one workspace path, but `register_workspace` was
called with another path.

Fix: restart server and choose the workspace you want to test.

### `Task path must be under .orchestrator/`

Cause: `submit_task.task_content_path` points outside workspace-local runtime.

Fix: put the smoke task under `.orchestrator/`, for example:

```text
.orchestrator/tasks/harness-smoke.md
```

### Worker exits or requeues task

Likely causes:

- Ollama is not reachable from the server process.
- Selected model is unavailable.
- The model wrote outside `target_files`, causing `SCOPE_VIOLATION`.
- Task file frontmatter `task_id` does not match submitted `task_id`.

Check:

```bash
npm run build
```

Then restart:

```bash
npm run serve
```

## Known Limitations

- Startup still uses an interactive prompt.
- Docker/Desktop flow needs a future non-interactive startup path, for example
  `--workspace-root` or `WORKSPACE_ROOT=/workspace`.
- Current runtime is single-workspace per server process.
- `.orchestrator/tasks/` is a smoke-test convention for now; it is not part of
  the bootstrap template yet.
