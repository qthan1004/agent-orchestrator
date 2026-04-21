# Task EV01: Create GEMINI.md

## Info
- **ID:** EV01-create-gemini-md
- **Module:** workspace config
- **Group:** 1 (AG Ecosystem Setup)
- **Dependencies:** none
- **Priority:** 1
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 1, §1.1

## What to do

Tạo file `GEMINI.md` tại workspace root. File này được AG tự động đọc và inject vào agent context (ưu tiên cao hơn AGENTS.md).

### [NEW] `GEMINI.md`

```markdown
# Agent Orchestrator — Gemini Rules

## Project Context
- MCP-based agent orchestrator server (Node.js, ESM)  
- Server port: 3847
- Architecture: DAG-based task queue, file-based IPC

## Agent Behavior
- ALWAYS read `.agent/workspace-memory.md` at session start (if exists)
- ALWAYS write `.agent/session.json` after each major action
- On error: report via MCP `report_error` tool, do NOT retry blindly
- Check `.agent/session.json` at start for resume context from previous session
- Use `scan_workspace` tool if workspace-memory.md doesn't exist

## Coding Standards
- Pure ESM (`import`/`export`), no CommonJS
- Zod for schema validation
- Conventional Commits for git messages
- JSDoc for all public functions

## File Convention
- Dev plans → `dev-docs/`
- Dev tasks → `tasks/pending/`
- Product plans → `plan/pending/` (DO NOT mix with dev docs)
```

> **Lưu ý:** Giữ dưới 500 words để tránh context overflow.

## Files
| Action | Path |
|--------|------|
| NEW    | `GEMINI.md` |

## Verification
- [ ] File tồn tại tại workspace root
- [ ] Nội dung ≤ 500 words
- [ ] Mở AG conversation mới → kiểm tra agent nhắc đến orchestrator context

## Done Criteria
- [ ] `GEMINI.md` tại root chứa đúng nội dung trên
