---
name: dev-task-protocol
description: Protocol để agent thực thi tasks từ tasks/ directory — pick, execute, complete
---

# Dev Task Protocol

> ⚠️ Skill tạm dùng cho development. Remove sau khi build xong.

## Task Board Structure

```
tasks/
├── pending/       ← Tasks chờ làm
├── processing/    ← Task đang làm (max 1 tại 1 thời điểm)
└── done/          ← Tasks đã xong
```

## Protocol

### Step 1: Pick Task

1. Đọc `tasks/README.md` → xem dependency graph
2. Tìm task có **số nhỏ nhất** trong `tasks/pending/` mà **dependencies đã nằm trong `tasks/done/`**
3. Move file: `tasks/pending/XX-xxx.md` → `tasks/processing/XX-xxx.md`
4. Đọc task file → hiểu yêu cầu

### Step 2: Execute Task

1. Đọc **What to Do** section → thực hiện từng bước
2. Đọc **Constraints** → tuân thủ nghiêm ngặt
3. Đọc **Files** table → chỉ tạo/sửa files trong danh sách
4. Nếu task reference skill → đọc skill đó trước
5. Nếu gặp blocker → ghi vào task file, hỏi user

### Step 3: Verify

1. Chạy **Verification** command trong task
2. Check tất cả **Done Criteria** — tick ✅ từng item
3. Nếu fail → fix → verify lại

### Step 4: Complete

1. Update task file: tick tất cả Done Criteria `[x]`
2. Move file: `tasks/processing/XX-xxx.md` → `tasks/done/XX-xxx.md`
3. Update `tasks/README.md` — đổi status ⬜ → ✅, update counts
4. Git commit: `feat(orchestrator): complete task XX — <title>`

## Rules

- ❌ KHÔNG skip verification
- ❌ KHÔNG làm 2 task cùng lúc
- ❌ KHÔNG sửa file ngoài danh sách trong task
- ✅ Hỏi user nếu task mơ hồ
- ✅ Đọc context.md trước khi bắt đầu bất kỳ task nào
- ✅ Follow git-commit-convention skill

## Quick Commands

```bash
# Xem task tiếp theo:
ls tasks/pending/

# Pick task (PowerShell):
Move-Item tasks/pending/XX-xxx.md tasks/processing/

# Complete task (PowerShell):
Move-Item tasks/processing/XX-xxx.md tasks/done/
```
