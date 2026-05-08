# Agent Prompts

This folder contains the system prompt to bootstrap agents in your IDE.

## Usage

1. Open your AI Assistant IDE (e.g., Cline, Cursor, or similar).
2. Copy the entire contents of `agent-prompt.md`.
3. Paste it as your first message to the assistant to initiate the agent loop.

### Available Prompt
- **`agent-prompt.md`** — Unified prompt supporting dynamic role switching between Worker ↔ Planner. The agent auto-detects its initial role from `register_worker` and transitions on-the-fly based on server directives (`BECOME_PLANNER`, `EXECUTE`, `IDLE`).
