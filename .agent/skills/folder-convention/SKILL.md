---
name: Folder Convention
description: Phân biệt folder dự án (product) vs folder dev. Dùng khi tạo plan, task, hoặc bất kỳ file nào liên quan đến workflow phát triển.
---

# Folder Convention

## Quy tắc bắt buộc

Khi làm việc với agent-orchestrator, **PHẢI** phân biệt 2 loại folder:

### 🔒 Product Folders (KHÔNG đụng khi plan/task dev)

Các folder này là **phần của sản phẩm**, ship cùng orchestrator cho end-user:

| Folder | Mục đích |
|--------|----------|
| `plan/` | Kế hoạch của end-user (pending → processing → done) |
| `exchange/` | File IPC — inbox, active, outbox, logs, checkpoints |
| `reference/` | Tools, skills, context đi kèm product |
| `templates/` | JSON contract templates |
| `prompts/` | Agent prompt templates |

> **KHÔNG** tạo dev plan, dev task, hay dev notes trong các folder này.

### 🔧 Dev Folders (dùng cho phát triển)

Các folder này phục vụ **quá trình phát triển** orchestrator:

| Folder | Mục đích |
|--------|----------|
| `dev-docs/` | Tài liệu kỹ thuật, migration plans, architecture docs |
| `tasks/` | Task board cho dev (pending → processing → done) |
| `.agent/` | Skills, workflows, tools cho dev agents |
| `tests/` | Test files |

### Áp dụng khi nào?

- **Tạo implementation plan** → viết vào `dev-docs/`, KHÔNG vào `plan/pending/`
- **Break task** → viết vào `tasks/pending/`, KHÔNG vào `plan/pending/`
- **Bug report** → viết vào `dev-docs/` hoặc `tasks/pending/`
- **Tạo skill cho dev** → `.agent/skills/`
- **Tạo workflow cho dev** → `.agent/workflows/`
