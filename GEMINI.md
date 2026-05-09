# Agent Orchestrator — Agent Rules

## ⚡ PREFLIGHT — MANDATORY (đọc TRƯỚC khi làm bất cứ gì)

**Mọi agent (Gemini, Codex, Claude, worker, v.v.) PHẢI đọc toàn bộ `.agent/` trước khi bắt đầu bất kỳ task nào.**

### Thứ tự đọc:

1. **`.agent/workspace-memory.md`** — Hiểu project context, architecture, active plans
2. **`.agent/skills/`** — Đọc TẤT CẢ skill files:
   - `personal-behavioral/SKILL.md` — Behavioral rules (ALWAYS APPLY)
   - `coding-standards/SKILL.md` — Cross-platform, shared types, no magic numbers
   - `folder-convention/SKILL.md` — Product vs dev folder rules
   - `safe-deletion/SKILL.md` — Never delete without permission
   - `strict-scope/SKILL.md` — Only do what's asked
   - `git-commit-convention/SKILL.md` — Conventional Commits
   - `token-optimization/SKILL.md` — Token usage rules
3. **`.agent/rules/`** — Project-specific rules:
   - `recovery-protocol.md` — Error recovery behavior
4. **`.agent/config.md`** — Agent configuration

### Sau preflight:
- Check `.agent/session.json` (nếu có) để resume context từ session trước
- Ghi `.agent/session.json` sau mỗi major action

### Nếu KHÔNG đọc preflight:
- Task output sẽ bị reject
- Agent sẽ vi phạm conventions và tạo ra code không đúng chuẩn

---

## Project Context
- MCP-based agent orchestrator server (Node.js, TypeScript, ESM)
- Server port: 3847
- Phase: **Phase 2 — Hybrid Agentic Architecture** (Phase 1 archived)
- Architecture: Server-Centric Unidirectional Data Flow (Head-Body-Limb)
- Dev runner: `npm run dev` (tsx) / `npm run build && npm run serve` (prod)

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
- Product skills → `reference/skills/` (NOT `.agent/skills/`)
- Dev skills → `.agent/skills/`

## Error Handling
- On error: report clearly, do NOT retry blindly
- Max 2 reflexion loops then checkpoint + exit
- Always include `error_context` in failure reports
