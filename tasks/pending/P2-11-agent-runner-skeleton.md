# Task P2-11: AgentRunner Skeleton

## Info
- **ID:** P2-11-agent-runner-skeleton
- **Module:** `src/worker/agent-runner.ts` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** P2-05, P2-09, P2-10
- **Priority:** 9
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.6

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Entry point cho worker subprocess. One-shot executor: stdin → LLM → tools → notify → exit.

### Flow:
1. Read stdin → parse JSON payload `{ worker_id, task_id, task_details, workspace_root, server_url, allowed_tools, model }`
2. Build initial prompt from task_details
3. Loop: OllamaClient.chat → parse tool_calls → ToolExecutor.execute → inject results → next turn
4. Exit when: LLM final answer (no tool_calls), max 50 tool calls, token checkpoint
5. HTTP POST to `server_url` → `complete_task(worker_id, task_id, summary)`
6. `exit(0)` on success, `exit(1)` on failure

**No reflexion loop yet** — that's P2-13.

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/agent-runner.ts` |

## Done Criteria
- [ ] Reads payload from stdin JSON
- [ ] Chat loop with Ollama (tool_calls → execute → inject)
- [ ] Exits after final answer (no tool_calls)
- [ ] Calls complete_task HTTP endpoint on exit
- [ ] Exit code 0 success, 1 failure
- [ ] `npm run build` pass
