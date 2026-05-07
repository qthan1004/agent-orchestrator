# Phase 2 Supplement: GitOps Observer for Autonomous Planning

> **Tags:** `features`, `gitops`, `phase-2`, `automation`
> **Date:** 2026-04-13
> **Status:** Conceptual Idea (To be implemented late Phase 2)
> **Goal:** Eliminate manual copy-pasting of tasks/plans and enable fully remote, autonomous task ingestion via Git.

---

## 1. Concept: Git as the Single Source of Truth

Currently, the Orchestrator relies on users manually placing Plans or Markdown files into the `plan/pending` or `tasks/pending` directories. 

The **GitOps Observer** module will shift this to a fully automated *Git-Driven Workflow*. The Orchestrator will directly monitor a Git branch for new commits containing `.md` plans and automatically ingest them.

### 1.1 Core Benefits

* **Zero-Touch Automation:** You can generate a Plan from your mobile phone, push it to Github, and the Orchestrator (running on a desktop with Local LLMs) will automatically sync and execute it.
* **Version Control for Orchestration:** Every Plan and Task execution becomes traceable. We can natively track *who* created the plan, *when* it was modified, and even rollback if a Local LLM worker breaks the code.
* **Conflict Resolution:** Git's native tree management handles edge cases where multiple agents might trample each other's files.
* **Branch-Based Workflows:** We can isolate feature development. A Plan could dictate: "Build this in `feature/auth`". The Orchestrator pulls the branch, processes the task queue, and pushes the result back to Github.

---

## 2. Architecture & Implementation Idea

### 2.1 The `git-watcher.mjs` Service (or Webhook)

We will introduce a lightweight Observer loop (or an HTTP Webhook endpoint) to the Body (Server).

**Option A: Long Polling (Cron-style)**
* A background script polls the Git remote every N minutes: `git fetch origin master`
* Checks for delta changes in `plan/`.
* `git pull` -> Triggers Orchestrator file system events -> Agent starts working.

**Option B: Webhooks (Near Real-Time)**
* A secure endpoint (e.g., `/api/webhook/github`) on the Orchestrator server that accepts HTTP POST requests.
* Pushing a commit triggers the Webhook.
* Server securely pulls and queues tasks immediately.

### 2.2 Interaction with Hybrid Workers (Qwen Coder)
Once `plan/pending` has a newly pulled plan, the Head (Opus Planner) dissects it, places `.json` into `exchange/inbox`, and the Server spins up Local LLM Workers (Qwen 9B/4B) to execute the code. Once execution passes `verification`, the Server can automatically `git commit` and `push` the final result.

---

## 3. Future Extension: Multi-Branch & CI/CD
Later down the line, we can allow the Orchestrator to natively handle `git checkout -b <new_feature>`, isolate local workers strictly into that branch path, and automatically open a Pull Request (PR) when tasks are marked `done`.
