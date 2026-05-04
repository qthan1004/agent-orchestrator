# Task P2-13: AgentRunner Reflexion Loop

## Info
- **ID:** P2-13-agent-runner-reflexion
- **Module:** `src/worker/agent-runner.ts`
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** P2-11
- **Priority:** 10
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Addendum Update 1 (P0)

## What to do

Thêm bounded reflexion vào AgentRunner.

### Reflexion logic:
1. Tool execution fails → inject error into next LLM turn
2. LLM diagnoses → fixes → retries (max 2 reflexion loops)
3. Still fails → checkpoint with diagnosis `{ error, hypothesis, attempted_fix }` → exit(1)

### Safety guards:
- No-tool detection: 3 consecutive turns without tool_calls → exit(1)
- JSON malformed: 3 retries then exit(1)
- Exit checkpoint always contains `error_context` field

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/agent-runner.ts` |

## Done Criteria
- [ ] Tool error → injected into next LLM turn → retry
- [ ] Max 2 reflexion loops then checkpoint + exit
- [ ] No-tool detection (3 turns) → exit(1)
- [ ] JSON malformed → 3 retries then exit(1)
- [ ] Exit checkpoint contains `error_context`
