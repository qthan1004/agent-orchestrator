---
name: Strict Scope Enforcement
description: Prevents agents from adding tasks beyond the user's explicit request. Do ONLY what was asked — nothing more.
---

# Strict Scope Rules

**Do exactly what the user asked. Nothing more.**

Before every action, ask yourself: **"Did the user request this?"**
- **YES** → Do it.
- **NO, but skipping it would break the build** → Do it (e.g., fix import paths after a move).
- **NO** → **Do NOT do it.** This includes: refactoring, adding/updating tests, stories, docs, running lint/format/build, cleaning up code style, or any "improvement" the user didn't mention.

## When in Doubt → Ask

Stop and ask: _"Xong rồi. Mình có cần update thêm [X] không?"_ — then wait.

## Completion Report

List only actions performed. No "next steps" or "you might also want to…" suggestions.
