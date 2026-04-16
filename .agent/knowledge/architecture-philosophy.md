# Agent Orchestrator: Architecture Philosophy

## 1. Zero-Knowledge Engine

The Orchestrator is a pure state machine for task distribution. It has **zero knowledge** of task content or target project tech stack.

**Its only responsibilities:**
- Move state files between `inbox/` → `active/` → `outbox/`
- DAG resolution: auto-unlock tasks when dependencies complete
- Worker management: detect crash/timeout, reclaim and requeue tasks

The Orchestrator works for any project — React, Node, a factory management system — everything is just graphs and data streams. **Never** put target-project business logic in the Orchestrator codebase.

## 2. Workspace-Root is the World

All truth, conventions, and structure live entirely at the target project's `workspace-root`.

- Orchestrator stores no project knowledge internally
- Project knowledge (like this file) must live in `.agent/knowledge/` inside the target workspace
- This makes the Orchestrator fully stateless relative to any project. Zero coupling.

## 3. Intelligence Lives in Agents

All intelligence comes from **Agents** (Planner & Worker) via LLM.

- Agents are "workers" who pick up tasks from the Orchestrator
- When receiving a task, agents don't invent code — they read existing code and scan `.agent/knowledge/` to learn the project's rules and stack
- Only after this pre-flight do they start writing code

> **Ideal scenario**: If a Planner enters a blank project with no `.agent/knowledge/`, it should auto-scan `package.json`, read `src/`, and **generate** these knowledge files for subsequent Workers to follow. Fully self-routing and self-learning.
