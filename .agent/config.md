---
name: Agent Boot Config
description: Mandatory pre-flight protocol for all agents. Read FIRST before any action.
enforcement: MANDATORY
---

# Agent Boot Config

**RULE ZERO**: Before executing ANY request, run this pre-flight. No exceptions.

## Pre-flight Protocol

### 1. Load Context

Read `.agent/workspace-memory.md`. This is the front door — project context, architecture, active plans.

### 2. Apply Behavioral Rules

Read `.agent/skills/personal-behavioral/SKILL.md`. This defines the owner's behavioral expectations, communication style, and hard boundaries. These rules **override default agent behavior** and apply across every task, every project, no exceptions.

### 3. Activate Always-on Skills

These apply to **every task**, no exceptions:

| Skill | Location | Rule |
|-------|----------|------|
| Safe Deletion | `.agent/skills/safe-deletion/SKILL.md` | Never delete without permission |
| Strict Scope | `.agent/skills/strict-scope/SKILL.md` | Do exactly what was asked |
| Folder Convention | `.agent/skills/folder-convention/SKILL.md` | Product vs dev folders |

### 4. Check Project Rules

Read `.agent/rules/recovery-protocol.md` — error recovery behavior.

### 5. Resume Check

- If `.agent/session.json` exists → resume session → read context + continue
- If not → new session → proceed normally
- Write `.agent/session.json` after each major action

## Execution Gate

Only AFTER completing steps 1–5 may you begin writing code, running commands, or creating files.

## Auto-Reload

Re-run pre-flight when:
- New task or topic change
- New slash command
- 5+ interactions without context refresh
