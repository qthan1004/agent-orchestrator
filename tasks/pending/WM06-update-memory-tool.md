# Task WM06: MCP Tool — update_memory (ADD-only + User-confirmed Retract)

## Info
- **ID:** WM06-update-memory-tool
- **Module:** src/mcp-server/tools/
- **Group:** 3 (Workspace Memory Pipeline)
- **Dependencies:** WM04
- **Priority:** 6
- **Ref:** `plan_workspace-memory-pipeline.md` Section 3.5
- **Updated:** 2026-05-21 (simplified from 5 CRUD actions → ADD-only + retract, Mem0 research insights)

## Design Decisions (from Mem0 research)

### Why ADD-only instead of full CRUD?

Original plan had 5 actions (`add | replace | merge | supersede | delete`) which creates:
- ❌ Many edge cases: duplicate detection, merge conflicts, partial matches, concurrent writes
- ❌ Agent must decide which action → easily picks wrong one
- ❌ Destructive operations (`delete`, `replace`) risk losing correct knowledge

New approach (inspired by Mem0 v3):
- ✅ ADD-only: append new fact with timestamp → immutable, no edge cases
- ✅ Retract: mark wrong fact (NOT delete) → requires user confirmation
- ✅ Temporal ranking: search returns newest facts first → stale facts auto-deprioritize
- ✅ Zero data loss: full history preserved, auditable

### Why user-confirmed retract?

Agent CRUD trên lessons quá risky:
- Agent retract đúng lesson → future workers mất knowledge
- Agent retract sai lesson → no harm (chỉ proposal, user quyết)
- **Rule: Agent có thể ADD tự do, nhưng RETRACT phải có user confirm**

## What to do

Tạo MCP tool `update_memory` — agent ghi learnings vào workspace memory (ADD-only, immutable).

### 1. Create tool module
**[NEW] `src/mcp-server/tools/update-memory.ts`**

Export `executeUpdateMemory(workspaceRoot, input)` returning `{ status, id?, hint? }`.

```typescript
// Simplified: only 2 actions
type MemoryAction = 'add' | 'retract';

interface UpdateMemoryInput {
  action: MemoryAction;  // default: 'add'
  kind: 'fact' | 'decision' | 'pitfall' | 'workflow';
  content: string;
  source?: string;       // task ID or session ID
  entities?: string[];   // entity tags for future search (Mem0 insight)
  paths?: string[];      // related file paths
  retractId?: string;    // only for action: 'retract'
}
```

**Action behaviors:**

| Action | Behavior | User confirm? |
|--------|----------|---------------|
| `add` | Append entry with timestamp + auto-generated ID. Dedup check (identical content → `duplicate`). | ❌ No — safe, append-only |
| `retract` | Mark entry as `retracted: true` with reason. Entry NOT deleted, still in file for audit. | ✅ **YES — server queues retract proposal, user must approve** |

**ADD flow:**
- No memory file → `{ status: 'no_memory_file', hint: 'Call scan_workspace first' }`
- Has `## Agent Learnings` → append entry after header
- No section → append section at EOF
- Dedup: identical content exists → `{ status: 'duplicate' }`
- Entry format:
  ```markdown
  - [mem.{auto-id}] {content} [source: {source}] ({YYYY-MM-DD})
    <!-- entities: {entity1}, {entity2} -->
    <!-- paths: {path1}, {path2} -->
  ```

**RETRACT flow:**
- Agent calls `retract` with `retractId` + reason
- Server does NOT immediately retract
- Server saves proposal to `<workspace-runtime>/memory/retract-proposals/{id}.json`
- Returns `{ status: 'retract_proposed', hint: 'Queued for user review' }`
- User reviews proposals via future MCP tool or manually
- Only after user approval → entry marked `<!-- retracted: {date}, reason: {reason} -->`

### 2. Temporal ranking (for memory_lookup, Phase 3)

Entries sorted by date when searched. No manual supersede needed:
- Newest matching fact ranks first
- Retracted entries filtered out
- Old contradicted facts naturally fall below newer corrections

### 3. Register
- Add `UPDATE_MEMORY: "update_memory"` to `TOOL_NAMES` in `constants.ts`
- Register in `tools.ts` with Zod schema per input above

### 4. Performance target: < 100ms (file append)

## Files
| Action | Path |
|--------|------|
| NEW | `src/mcp-server/tools/update-memory.ts` |
| MODIFY | `src/constants.ts` |
| MODIFY | `src/mcp-server/tools.ts` |

## Done Criteria
- [ ] `update_memory` MCP tool registered and callable
- [ ] `add` action appends immutable entry with ID, timestamp, entities, paths
- [ ] `retract` action creates proposal file — does NOT modify memory directly
- [ ] Returns `no_memory_file` / `duplicate` / `retract_proposed` correctly
- [ ] Dedup prevents identical entries (content hash comparison)
- [ ] `TOOL_NAMES.UPDATE_MEMORY` constant added
- [ ] `npm run build` passes
