---
description: Show current task board status — pending, processing, done counts
---

# Task Status

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

// turbo-all

1. Chạy task-board tool:
```powershell
node tools/task-board.mjs
```

2. Đọc kết quả: view file `tasks/.tmp/board.md`

3. Chạy dependency check:
```powershell
node tools/check-deps.mjs
```

4. Đọc kết quả: view file `tasks/.tmp/deps-check.md`

5. Hiển thị tổng hợp cho user: board + tasks ready to start
