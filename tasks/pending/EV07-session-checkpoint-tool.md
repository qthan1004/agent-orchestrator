# Task EV07: session_checkpoint MCP Tool

## Info
- **ID:** EV07-session-checkpoint-tool
- **Module:** src/mcp-server/tools/
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV01
- **Priority:** 7
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 2, §2.2

## What to do

Tạo MCP tool `session_checkpoint` — save/load/clear session state cho agent resume.

### [NEW] `src/mcp-server/tools/session-checkpoint.mjs`

> Hoặc `.ts` nếu migration M01-M06 đã xong.

**Logic:**

```
Input: {
  action: "save" | "load" | "clear",
  task_id?: string,
  progress?: number,       // 0-100
  context?: object          // arbitrary context data
}

save:
  → Write .agent/session.json:
    {
      "saved_at": "<ISO timestamp>",
      "task_id": "<string>",
      "progress": <number>,
      "context": { ... },
      "workspace": "<workspace root path>"
    }

load:
  → Read .agent/session.json
  → Return context cho agent resume
  → Nếu file không tồn tại → return { status: "no_session" }

clear:
  → Delete .agent/session.json (task completed)
  → Return { status: "cleared" }
```

**Zod Schema (tool input):**

```typescript
const SessionCheckpointInput = z.object({
  action: z.enum(['save', 'load', 'clear']),
  task_id: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  context: z.record(z.unknown()).optional(),
});
```

**Tool registration:** Đăng ký trong `src/mcp-server/tools.mjs` (hoặc dedicated tools/index).

## Files
| Action | Path |
|--------|------|
| NEW    | `src/mcp-server/tools/session-checkpoint.mjs` (hoặc `.ts`) |
| MODIFY | `src/mcp-server/tools.mjs` (register tool) |

## Verification
```bash
# Call session_checkpoint(save) → .agent/session.json created
# Call session_checkpoint(load) → returns saved data
# Call session_checkpoint(clear) → .agent/session.json deleted
```

## Done Criteria
- [ ] `session_checkpoint` tool registered và callable qua MCP
- [ ] `save` ghi `.agent/session.json` đúng format
- [ ] `load` đọc và trả về session data
- [ ] `load` khi không có file → `{ status: "no_session" }`
- [ ] `clear` xóa file → `{ status: "cleared" }`
