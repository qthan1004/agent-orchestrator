# Task P2-32: Server-side Respawn with Handover Context

## Info
- **ID:** P2-32-respawn-with-handover
- **Module:** `src/worker/dispatch-loop.ts`
- **Group:** Core — LLM Harness
- **Dependencies:** P2-29, P2-30
- **Priority:** 17
- **Ref:** `dev-docs/2026-05-21_design_llm-harness-wrapper.md` Section 3

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Design Context

When a worker hits 85% context and generates a handover report (P2-30), the server must:
1. Receive the handover from the dying worker
2. Kill the worker and unload the model
3. Spawn a NEW worker with the handover prepended as initial context
4. New worker continues from where the previous one stopped

This completes the lifecycle: **evaluate → start → inject → kill → loop**.

## What to do

### 1. Detect `context_exceeded` in worker completion endpoint

Update `/api/worker/complete` in `src/mcp-server/index.ts`:

```typescript
app.post('/api/worker/complete', (req, res) => {
  const { worker_id, task_id, summary, success, error_context, changelog } = req.body;

  // ... existing validation ...

  if (!success && error_context?.error === 'context_exceeded' && error_context?.handover) {
    // Context exceeded — requeue with handover
    stateManager.requeueWithHandover(task_id, error_context.handover, workspace_root);
    workerRegistry.clearAssignment(worker_id);
    stateManager.saveCheckpoint();
    res.json({ accepted: true, action: 'requeued_with_handover' });
    return;
  }

  // ... existing success/failure handling ...
});
```

### 2. Add `requeueWithHandover()` to StateManager

```typescript
requeueWithHandover(taskId: string, handover: string, workspaceRoot: string): void {
  const task = this.getActiveTask(taskId);
  if (!task) return;

  // Attach handover to task metadata
  (task as any).handover_context = handover;
  (task as any).respawn_count = ((task as any).respawn_count || 0) + 1;

  // Requeue — dispatch loop will pick it up next cycle
  this.moveFromActiveToInbox(taskId);
}
```

### 3. Update dispatch-loop to inject handover into new worker

When the dispatch loop picks a task that has `handover_context`:

```typescript
// In dispatch-loop.ts, when building assignment payload:
if ((task as any).handover_context) {
  const handoverPrefix = [
    '## Handover from Previous Worker',
    '',
    (task as any).handover_context,
    '',
    '---',
    '## Original Task (continue from where previous worker stopped)',
    ''
  ].join('\n');

  payload.task_details = handoverPrefix + payload.task_details;
}
```

### 4. Enforce respawn limit

Prevent infinite respawn loops:

```typescript
const MAX_RESPAWNS = 3;

if ((task as any).respawn_count >= MAX_RESPAWNS) {
  stateManager.moveToOutbox(task.id, {
    task_id: task.id,
    status: 'blocked',
    summary: `Task exceeded max respawns (${MAX_RESPAWNS}). Consider using a cloud model.`,
    blocked_reason: 'max_respawns_exceeded'
  });
  continue;
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/index.ts` (worker complete endpoint) |
| MODIFY | `src/mcp-server/state-manager.ts` (add requeueWithHandover) |
| MODIFY | `src/worker/dispatch-loop.ts` (inject handover + respawn limit) |

## Done Criteria
- [ ] Server detects `context_exceeded` with handover in worker completion
- [ ] `requeueWithHandover()` moves task back to pending with handover attached
- [ ] Dispatch loop injects handover as prefix when spawning new worker
- [ ] New worker receives previous worker's handover as initial context
- [ ] Respawn count tracked per task
- [ ] Max 3 respawns — after that, task marked as `blocked`
- [ ] Respawn count and handover events logged for observability
- [ ] Normal task completion (success/failure) NOT affected
- [ ] `npm run build` passes
