# Task WM06: MCP Tool — update_memory (Agent Write-Back)

## Info
- **ID:** WM06-update-memory-tool
- **Module:** src/mcp-server/tools/
- **Group:** 3 (Workspace Memory Pipeline)
- **Dependencies:** WM04
- **Priority:** 6
- **Ref:** `plan_workspace-memory-pipeline.md` Section 3.5

## What to do

Tạo MCP tool `update_memory` — agent tự ghi learnings vào workspace-memory.md.

### 1. Create tool module
**[NEW] `src/mcp-server/tools/update-memory.ts`**

Export `executeUpdateMemory(workspaceRoot, { content, source })` returning `{ status, entry?, hint? }`.

Behaviors:
- No memory file → `{ status: 'no_memory_file', hint: 'Call scan_workspace first' }`
- Has "## Agent Learnings" → insert entry after header
- No section → append section at EOF
- Dedup: identical content exists → `{ status: 'duplicate' }`
- Entry format: `- {content} [source: {source}] (YYYY-MM-DD)`

### 2. Register
- Add `UPDATE_MEMORY: "update_memory"` to `TOOL_NAMES` in `constants.ts`
- Register in `tools.ts` with Zod schema: `content: z.string()`, `source: z.string().optional()`

### 3. Performance target: < 100ms

## Files
| Action | Path |
|--------|------|
| NEW | `src/mcp-server/tools/update-memory.ts` |
| MODIFY | `src/constants.ts` |
| MODIFY | `src/mcp-server/tools.ts` |

## Done Criteria
- [ ] `update_memory` MCP tool registered and callable
- [ ] Appends learning to "## Agent Learnings" section
- [ ] Returns `no_memory_file` / `duplicate` correctly
- [ ] Dedup prevents identical entries
- [ ] `TOOL_NAMES.UPDATE_MEMORY` constant added
- [ ] `npm run build` passes
