# Task WM07: Prompt Update — Memory Lifecycle Instructions

## Info
- **ID:** WM07-prompt-memory-lifecycle
- **Module:** prompts/
- **Group:** 4 (Workspace Memory Pipeline)
- **Dependencies:** WM05, WM06
- **Priority:** 7
- **Ref:** `plan_workspace-memory-pipeline.md` Section 6

## What to do

Update agent prompt to include workspace memory lifecycle instructions.
Agent phải biết khi nào đọc memory, khi nào ghi learning.

### 1. Update agent prompt
**[MODIFY] `prompts/agent-prompt.md`**

Thêm section mới:

```markdown
## Workspace Memory Protocol
1. Start: read `.agent/workspace-memory.md` → understand project structure, skip discovery
2. If file > 30KB: read only Project Overview + Architecture Relationships
3. If file missing: call `scan_workspace` tool to generate
4. During work: discover useful pattern/learning → call `update_memory`
   - Good learnings: co-change patterns, build quirks, naming conventions, gotchas
   - Bad learnings: obvious/temporary info, task-specific details
5. On force_update: existing learnings auto-preserved
```

### 2. Update GEMINI.md
**[MODIFY] `GEMINI.md`**

Add `update_memory` to tool list awareness.

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |
| MODIFY | `GEMINI.md` |

## Done Criteria
- [ ] Agent prompt has "Workspace Memory Protocol" section
- [ ] Instructions cover: read on start, write learnings, 30KB guard
- [ ] GEMINI.md mentions update_memory tool
- [ ] `npm run build` passes (no code changes, but verify)
