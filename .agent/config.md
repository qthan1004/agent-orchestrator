---
name: Agent Boot Config
description: Mandatory pre-flight protocol for all agents. Read FIRST before any action.
enforcement: MANDATORY
---

# Agent Boot Config

**RULE ZERO**: Before executing ANY request, run this pre-flight. No exceptions. No reminders needed.

## Pre-flight Protocol

### 1. Load Knowledge

Read all files in `.agent/knowledge/`. These define architecture, constraints, and conventions. Comply with everything found here.

### 2. Activate Skills

Scan `.agent/skills/*/SKILL.md`:

**Always-on** (every task, no exceptions):
- `safe-deletion` — Never delete files without explicit user permission
- `strict-scope` — Do exactly what was asked, nothing more
- `folder-convention` — Distinguish product vs dev folders

**Selective**: Read each skill's `description` frontmatter. Deep-read only if relevant to current task.

### 3. Match Workflows

Scan `.agent/workflows/*.md`. Match by trigger:

| Trigger | Workflow |
|---------|----------|
| `/pick-task` | `pick-task.md` |
| `/push-git` | `push-git.md` |
| Bug-related task | `save-bug-report.md` |
| Planning task | `save-plan.md` |
| No match | Skip |

### 4. Discover Tools

Scan `.agent/tools/`. Read `README.md` if available. Note what's available — do NOT run anything yet.

## Execution Gate

Only AFTER completing steps 1–4 may you begin writing code, running commands, or creating files.

## Auto-Reload

Re-run pre-flight when:
- New task or topic change
- New slash command
- 5+ interactions without context refresh
