---
description: Complete current task — verify, tick done criteria, move to done/, commit
---
# Complete Task

1. Get current task:
// turbo
```powershell
Get-ChildItem tasks/processing/ -Filter *.md -Name -ErrorAction SilentlyContinue
```
Empty → "Không có task processing" → dừng.

2. Đọc task → chạy **Verification** → check **Done Criteria**
   Chưa đạt → liệt kê → hỏi user

3. Tick `[x]` tất cả Done Criteria trong task file

4. Move + update board:
```powershell
Move-Item "tasks/processing/<task>" "tasks/done/"
```

// turbo
```powershell
node tools/task-board.mjs
```

5. Update `tasks/README.md` — status ⬜→✅, counts

6. Commit:
```powershell
git add tasks; git commit -m "feat(orchestrator): complete task XX — <title>"
```

7. Check next:
// turbo
```powershell
node tools/check-deps.mjs
```
View `tasks/.tmp/deps-check.md` → thông báo next task
