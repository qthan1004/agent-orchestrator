# Implementation Plan: Server Optimization & Bug Fixes (v2)

> Source: `TODO_FIXES.md` — Discussion review v6 FINAL
> Created: 2026-04-06
> Status: pending

## Overview

Cải tiến toàn diện MCP Orchestrator: tối ưu token usage, push logic về server, fix task lock bugs, cải thiện prompt templates và startup UX.

## Phases & Dependencies

```
Phase 1: Server Core (foundation — mọi thứ phụ thuộc)
  ├── Group 1: Constants & Config refactor
  ├── Group 2: WorkerRegistry + Role Manager
  └── Group 3: Long Polling + Directive responses

Phase 2: Combo Tools & Push-to-Server
  ├── Group 4: register_worker gộp role
  ├── Group 5: complete_task combo + auto-heartbeat
  └── Group 6: submit_decomposition combo + Planner re-election

Phase 3: Bug Fixes & Safety
  ├── Group 7: Task lock fixes + force_release_task
  └── Group 8: Startup interactive prompt

Phase 4: Prompts & Docs
  ├── Group 9: Prompt templates (prompts/ folder)
  └── Group 10: SKILL.md + workflow updates
```

## Task List (20 tasks)

See individual task files: `tasks/pending/XX-*.md`

| ID | Title | Group | Dependencies |
|----|-------|-------|-------------|
| 01 | Constants: thêm WORKER_ROLE, AGENT_ACTION | G1 | — |
| 02 | Config: thêm pollTimeout, startup config schema | G1 | — |
| 03 | WorkerRegistry: thêm role field + getActivePlanner | G2 | 01 |
| 04 | StateManager: thêm checkPlansQuick() | G2 | — |
| 05 | waitForTask helper: Long Polling logic | G3 | 02 |
| 06 | get_next_task: Long Poll + IDLE/EXECUTE directive | G3 | 03, 04, 05 |
| 07 | check_plans: Long Poll + IDLE/DECOMPOSE directive | G3 | 04, 05 |
| 08 | register_worker: gộp role + queue summary | G4 | 03, 06 |
| 09 | resolveIdleAction: BECOME_PLANNER logic | G5 | 03, 04 |
| 10 | complete_task: combo auto_pickup + re-election | G5 | 06, 09 |
| 11 | Auto-heartbeat middleware (withHeartbeat) | G5 | 03 |
| 12 | submit_decomposition: combo next plan status | G6 | 04, 07 |
| 13 | StateManager: error handling moveToActive/Outbox | G7 | — |
| 14 | TaskQueue: rename completeTask → updateTaskStatus | G7 | 13 |
| 15 | force_release_task: new MCP tool | G7 | 03, 14 |
| 16 | Startup interactive prompt (promptConfig) | G8 | 02 |
| 17 | index.mjs: integrate promptConfig → startServer | G8 | 16 |
| 18 | prompts/ folder: planner-prompt.md + worker-prompt.md | G9 | — |
| 19 | SKILL.md: update 2-mode, inline task, role transitions | G10 | 18 |
| 20 | TODO_FIXES.md: update status, reference task IDs | G10 | all |
