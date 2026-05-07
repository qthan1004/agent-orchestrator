# Agent Orchestrator: Architecture Philosophy

## 1. Zero-Knowledge Engine

The Orchestrator is a pure state machine for task distribution. It has **zero knowledge** of task content or target project tech stack.

**Its only responsibilities:**
- Manage task lifecycle (pending → dispatched → complete/failed)
- DAG resolution: auto-unlock tasks when dependencies complete
- Worker management: spawn subprocess, detect crash/timeout, requeue
- Memory injection: load relevant context for worker before dispatch

The Orchestrator works for any project — React, Node, Go, a factory management system — everything is just graphs and data streams. **Never** put target-project business logic in the Orchestrator codebase.

## 2. Server-Centric Unidirectional Data Flow (Phase 2)

```
Server (Head) → dispatches task + memory bundle → Agent Runner (Body) → executes → reports back
```

- **Server**: Owns state, schedules work, manages workers
- **Agent Runner**: One-shot executor (stdin → LLM → tools → notify → exit)
- **Workers**: Ephemeral subprocesses, no loop, no queue access
- Communication: stdin/stdout + HTTP (language-agnostic)

## 3. Intelligence Lives in Agents (via LLM)

All intelligence comes from **LLM-powered Agents** (Planner & Worker).

- Agents receive task + context bundle from server
- Agents read workspace skills from `reference/skills/` to learn project conventions
- Post-task reflections saved to global case-bank for future learning
- Reflexion loop: max 2 retries on error, then checkpoint + exit

## 4. Multi-Workspace by Design

- Global state: `~/.orchestrator/` (config, case-bank, domain profiles)
- Per-workspace state: registered via `register_workspace`
- No hard-coded paths — all paths resolved from workspace root

## 5. LLM Harness: Cloud + Local

- `LLMAdapter` interface: unified contract for all LLM backends
- `OllamaAdapter`: local models (Qwen, etc.)
- `GeminiAdapter`: cloud API
- Agent Runner uses adapter, not specific LLM — language and backend agnostic
