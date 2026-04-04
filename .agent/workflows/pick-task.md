---
description: Pick next available task from pending/ — check dependencies, move to processing
---

# Pick Task

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

// turbo-all

1. Đọc skill `dev-task-protocol`: view file `.agent/skills/dev-task-protocol/SKILL.md`

2. Đọc context: view file `reference/context/context.md`

3. Kiểm tra tasks/processing/ — nếu đã có task đang làm → thông báo và dừng

4. Liệt kê tasks đã done:
```powershell
ls tasks/done/
```

5. Liệt kê tasks pending:
```powershell
ls tasks/pending/
```

6. Tìm task có số nhỏ nhất trong pending/ mà dependencies đã nằm trong done/ (xem dependency trong tasks/README.md hoặc trong file task)

7. Move task sang processing:
```powershell
Move-Item "tasks/pending/<task-file>" "tasks/processing/"
```

8. Đọc task file vừa pick → hiểu yêu cầu

9. Thông báo cho user: "Đã pick task XX — <title>. Ready to execute."
