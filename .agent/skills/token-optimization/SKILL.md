---
name: Token Optimization & Context Management
description: Rules for breaking down long plans, archiving old context, and preventing quota exhaustion during long coding sessions.
---

# Token Optimization Rules

To prevent hitting context window limits (quota exhaustion) during long pair-programming sessions, follow these workflow rules:

## 1. Modularize Plans (Index Pattern)
**Never create or maintain monolithic 400+ line Markdown files.**
- Create a master `index.md` (e.g., `plan/menu/index.md`) that acts as a Table of Contents with a 1-2 sentence summary of each section.
- Split the actual details into smaller chapter files (e.g., `01-architecture.md`, `02-api-design.md`, `03-components.md`).
- **How to read:** The AI MUST only read `index.md` first. Based on the current specific task, the AI will use `view_file` to read ONLY the 1 or 2 relevant sub-files. Never read all sub-files at once.

## 2. Context Pruning (Active vs Archive)
Keep the AI's immediate context focused only on what is currently being built.
- Maintain a `plan/current-task.md` that contains ONLY the immediate next steps, current bugs, and active state.
- Once a feature or sub-module is "done", summarize the completion in a few lines, and MOVE the detailed planning files into a `plan/archive/` or `plan/old/` directory.
- Delete or overwrite outdated checklists instead of letting them grow indefinitely.

## 3. Turn Limit & Handoff Warning (Save Quota)
If a single task or debugging session requires more than 5-7 continuous complex tool turns (heavy terminal outputs, reading multiple large files, etc.), the AI must:
1. **Pause execution**.
2. Update `plan/current-task.md` with a clean, highly compressed summary of the current state and blockers.
3. Use `notify_user` to suggest: *"Chúng ta đã thao tác khá dài và tốn context. Bạn có muốn tạo New Chat để tiết kiệm quota không? Mình đã cập nhật file `plan/current-task.md` để chat mới có thể đọc và code tiếp ngay lập tức."*
4. Wait for user instruction (switch model, new chat, or force continue).
