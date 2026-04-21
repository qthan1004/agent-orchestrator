---
name: Folder Convention
description: Distinguish product folders from dev folders. Apply when creating plans, tasks, or dev files.
---

# Folder Convention

**Two folder types exist — never mix them.**

## Product Folders (DO NOT use for dev artifacts)

These ship with the orchestrator for end-users:

| Folder | Purpose |
|--------|---------|
| `plan/` | End-user plans (pending → processing → done) |
| `exchange/` | File IPC — inbox, active, outbox, logs, checkpoints |
| `reference/` | Tools, skills, context bundled with product |
| `templates/` | JSON contract templates |
| `prompts/` | Agent prompt templates |

## Dev Folders (for development only)

These support orchestrator development:

| Folder | Purpose |
|--------|---------|
| `dev-docs/` | Technical docs, migration plans, architecture |
| `tasks/` | Dev task board (pending → processing → done) |
| `.agent/` | Skills, workflows, tools for dev agents |
| `tests/` | Test files |

## Quick Reference

| Creating... | Put in... | NOT in... |
|-------------|-----------|-----------|
| Implementation plan | `dev-docs/` | `plan/pending/` |
| Dev task | `tasks/pending/` | `plan/pending/` |
| Bug report | `dev-docs/` or `tasks/pending/` | `plan/` |
| Dev skill | `.agent/skills/` | `reference/skills/` |
| Dev workflow | `.agent/workflows/` | `reference/workflows/` |
