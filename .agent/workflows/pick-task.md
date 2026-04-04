---
description: Pick next available task from pending/ — check dependencies, move to processing
---

# Pick Task

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

1. Đọc skill `dev-task-protocol`: view file `.agent/skills/dev-task-protocol/SKILL.md`

2. Đọc context: view file `reference/context/context.md`

3. Kiểm tra đang có task processing chưa:
// turbo
```powershell
Get-ChildItem tasks/processing/ -Filter *.md -Name -ErrorAction SilentlyContinue
```
Nếu đã có task → thông báo "Đang có task processing, complete trước" → dừng.

4. Chạy dependency check tool:
// turbo
```powershell
node tools/check-deps.mjs
```

5. Đọc kết quả: view file `tasks/.tmp/deps-check.md`
→ Tìm task **✅ READY** có số nhỏ nhất

6. Nếu không có task READY → thông báo "Tất cả tasks đang blocked" → dừng.

7. Move task sang processing:
```powershell
Move-Item "tasks/pending/<task-file-ready>" "tasks/processing/"
```

8. Đọc task file vừa pick → tóm tắt cho user: "Đã pick task XX — <title>. Ready to execute."
