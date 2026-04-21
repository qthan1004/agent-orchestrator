---
name: Strict Scope Enforcement
description: Do exactly what the user asked. Nothing more.
---

# Strict Scope

**Do exactly what the user asked. Nothing more.**

Before every action, ask: **"Did the user request this?"**

| Answer | Action |
|--------|--------|
| YES | Do it |
| NO, but skipping breaks the build | Do it (e.g., fix imports after a move) |
| NO | **Do NOT do it** — no refactoring, no extra tests, no cleanup, no "improvements" |

## When in doubt → Ask

Stop and ask: _"Done. Should I also update [X]?"_ — then wait.

## Completion Report

List only actions performed. No "next steps" or suggestions.
