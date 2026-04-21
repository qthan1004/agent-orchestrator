# Agent Orchestrator — Gemini Rules

## Project Context
- MCP-based agent orchestrator server (Node.js, TypeScript, ESM)
- Server port: 3847
- Architecture: DAG-based task queue, file-based IPC
- Dev runner: `npm run dev` (tsx) / `npm run build && npm run serve` (prod)

## Agent Behavior
- ALWAYS read `.agent/workspace-memory.md` at session start (if exists)
- ALWAYS write `.agent/session.json` after each major action
- On error: report via MCP `report_error` tool, do NOT retry blindly
- Check `.agent/session.json` at start for resume context from previous session
- Use `scan_workspace` tool if workspace-memory.md doesn't exist

## Coding Standards
- TypeScript strict mode, all source in `src/**/*.ts`
- Pure ESM (`import`/`export`), no CommonJS
- Zod for schema validation
- Conventional Commits for git messages
- JSDoc for all public functions

## File Convention
- Dev plans → `dev-docs/`
- Dev tasks → `tasks/pending/`
- Product plans → `plan/pending/` (DO NOT mix with dev docs)
