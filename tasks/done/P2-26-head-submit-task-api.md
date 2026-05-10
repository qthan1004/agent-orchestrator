# Task P2-26: Head -> Server Task Submission API

## Info
- **ID:** P2-26-head-submit-task-api
- **Module:** `src/mcp-server/tools.ts`, `src/mcp-server/task-queue.ts`, `src/worker/dispatch-loop.ts`, `src/worker/tool-executor.ts`
- **Group:** Architecture Core
- **Dependencies:** P2-25, P2-20
- **Priority:** 7
- **Ref:** Head-Body-Limb architecture - Head (Planner) -> Body (Server) interface

## Context

The Head (Planner) is the IDE agent + human. After discussing and approving a plan, the Head decomposes it into task files in the workspace and submits them to the Server for dispatch.

Design decisions (chot 2026-05-10):
- **Option A (Manual Head):** Human + IDE agent acts as Planner. No LLM-powered auto-planning.
- **Enforce cung:** Worker writes outside declared scope -> STOP + report `scope_violation`
- **Metadata lean:** Server only holds task_id + workspace_id + scheduling metadata. Task content (including target_files) lives in workspace.

## What to do

### 1. Task file format (in workspace)

Planner creates task `.md` files in workspace. Each task file MUST include a YAML frontmatter:

```yaml
---
task_id: P2-11
action: implement
depends_on: [P2-05, P2-09, P2-10]
target_files:
  - src/worker/agent-runner.ts
  - src/worker/types.ts
read_files:
  - src/models/index.ts
  - src/constants.ts
priority: 0
---
```

The body of the markdown is the task description (free-form, for worker to read).

### 2. MCP tool: `submit_task`

```typescript
// Head (IDE agent) calls this after creating task file
submit_task({
  task_id: string,
  workspace_id: string,
  task_content_path: string  // relative to workspace root, e.g. "tasks/pending/P2-11.md"
})
```

Server behavior on submit:
1. Resolve full path: `workspace_root + task_content_path`
2. Read task file -> parse YAML frontmatter -> extract `depends_on`, `target_files`, `priority`, `action`
3. Register in TaskQueue with parsed metadata
4. Return `{ status: 'registered', task_id, target_files_count, depends_on_count }`

### 3. Conflict detection in DispatchLoop

Before dispatching, check:

```typescript
function canDispatch(task: TaskMetadata, activeTasks: TaskMetadata[]): boolean {
  // 1. All dependencies resolved?
  const allDepsResolved = task.depends_on.every(
    dep => getTask(dep)?.status === 'done'
  );
  if (!allDepsResolved) return false;

  // 2. File conflict with any active task?
  const activeFiles = new Set(activeTasks.flatMap(t => t.target_files));
  const hasConflict = task.target_files.some(f => activeFiles.has(f));
  if (hasConflict) return false;

  return true;
}
```

Dispatch priority when multiple tasks are eligible:
1. `priority` number (lower first)
2. Fewer `target_files` first (finishes faster -> releases locks sooner)
3. FIFO (`created_at`)

### 4. Scope enforcement in ToolExecutor

When worker attempts to write a file:
1. Check if file path is in `target_files` (declared by planner)
2. If YES -> allow write
3. If NO -> reject write, worker receives error: `SCOPE_VIOLATION: file not in declared target_files`
4. Worker should STOP and report `scope_violation` to server
5. Server marks task as `blocked` with reason -> planner/user reviews

### 5. TaskMetadata (server-side index)

```typescript
interface TaskMetadata {
  task_id: string;
  workspace_id: string;
  task_content_path: string;

  // Parsed from task file
  priority: number;
  status: 'pending' | 'active' | 'done' | 'failed' | 'blocked';
  action: string;
  depends_on: string[];
  target_files: string[];
  read_files: string[];

  // Lifecycle
  created_at: string;
  started_at?: string;
  completed_at?: string;
  blocked_reason?: string;
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools.ts` - add `submit_task` tool |
| MODIFY | `src/mcp-server/task-queue.ts` - add TaskMetadata, conflict detection |
| MODIFY | `src/worker/dispatch-loop.ts` - use canDispatch() |
| MODIFY | `src/worker/tool-executor.ts` - add scope enforcement |
| NEW    | `src/models/task-metadata.ts` - TaskMetadata type + YAML parser |

## Done Criteria
- [x] `submit_task` MCP tool registered and callable
- [x] Server reads task file, parses YAML frontmatter
- [x] TaskQueue stores metadata with target_files + depends_on
- [x] DispatchLoop checks dependency resolution before dispatch
- [x] DispatchLoop checks file conflict before dispatch
- [x] ToolExecutor enforces write scope (target_files only)
- [x] Scope violation -> worker STOP + report to server
- [x] Priority ordering: priority -> fewer files -> FIFO
- [x] `npm run build` pass
