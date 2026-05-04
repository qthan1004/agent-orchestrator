# Task P2-09: ToolExecutor (Workspace-Sandboxed)

## Info
- **ID:** P2-09-tool-executor
- **Module:** `src/worker/tool-executor.ts` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** none
- **Priority:** 8
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.4

## What to do

Tạo `ToolExecutor` class — executes tools within workspace sandbox.

### API:

```typescript
class ToolExecutor {
  constructor(workspaceRoot: string, allowedTools: string[]);
  execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult>;
  getCallCount(): number;
}
```

### Tools to implement:
1. **`view_file`** `{ path, start_line?, end_line? }` → file contents
2. **`list_dir`** `{ path }` → directory listing
3. **`write_to_file`** `{ path, content }` → create/overwrite file
4. **`replace_file_content`** `{ path, target, replacement }` → edit file
5. **`run_command`** `{ command, cwd? }` → exec command (cwd must be within workspace)

### Security:
- **Path sandbox**: ALL paths resolved against `workspaceRoot`. Reject path traversal (`../`), absolute paths outside workspace, symlinks escaping workspace.
- **Allowed tools**: Only execute tools in `allowedTools` list. Unknown tool → error.
- **Max calls**: 50 tool calls per session → throw after 50th.

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/tool-executor.ts` |

## Verification
```bash
npm run build
# Test sandbox: path traversal → rejected
# Test tool execution: write file → file exists
# Test limit: 51st call → error
```

## Done Criteria
- [ ] Path outside workspace → rejected with clear error
- [ ] Path traversal (`../../etc/passwd`) → rejected
- [ ] All 5 tools implemented and functional
- [ ] Tool not in allowedTools → rejected
- [ ] 51st tool call → error thrown
- [ ] `npm run build` pass
