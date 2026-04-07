# Implementation Plan: Phase 1 Prompt Fixes & Token Optimization

> Source: `dev-docs/enhance-phase1-prompt-fixes.md`
> Created: 2026-04-07
> Status: pending

## Overview

Sửa các lỗi về prompt, context path, disconnect worker và Zod stripping.

## Task List

| ID | Title | File |
|----|-------|------|
| 01 | Thêm Path Context vào `register_worker` và config | `tasks/pending/01-add-path-context.md` |
| 02 | Hướng dẫn Planner truyền `source_plan` để chuyển plan | `tasks/pending/02-enforce-source-plan.md` |
| 03 | Củng cố Idle Loop cho Worker | `tasks/pending/03-strengthen-idle-loop.md` |
| 04 | Fix Zod strip dữ liệu và áp dụng `compactTask()` | `tasks/pending/04-zod-passthrough-compact.md` |
| 05 | Auto-kill & Requeue tasks thay vì check sau 24h | `tasks/pending/05-worker-auto-kill.md` |
| 06 | Planner Auto-Discovery Phase (Mode B) | `tasks/pending/06-planner-discovery-phase.md` |
