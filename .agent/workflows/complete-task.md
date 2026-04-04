---
description: Complete current task — verify, tick done criteria, move to done/, commit
---

# Complete Task

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

1. Kiểm tra task đang processing:
// turbo
```powershell
Get-ChildItem tasks/processing/ -Filter *.md -Name -ErrorAction SilentlyContinue
```
Nếu empty → thông báo "Không có task đang processing" → dừng.

2. Đọc task file trong `tasks/processing/`

3. Chạy **Verification** commands từ task file (nếu có)

4. Check từng **Done Criteria** — xác nhận tất cả đã hoàn thành
   Nếu có tiêu chí CHƯA đạt → liệt kê và hỏi user muốn continue hay fix

5. Update task file: tick tất cả Done Criteria thành `[x]`

6. Move task sang done:
```powershell
Move-Item "tasks/processing/<task-file>" "tasks/done/"
```

7. Chạy task-board tool để update status:
// turbo
```powershell
node tools/task-board.mjs
```

8. Đọc board mới: view file `tasks/.tmp/board.md` → lấy info cho commit message và next task

9. Update `tasks/README.md`:
   - Đổi task status từ ⬜ Pending → ✅ Done
   - Update counts ở đầu file
   - Cập nhật path file (`pending/` → `done/`)

10. Git commit:
```powershell
git add tasks; git commit -m "feat(orchestrator): complete task XX — <title>"
```

11. Chạy dependency check cho remaining tasks:
// turbo
```powershell
node tools/check-deps.mjs
```

12. Đọc kết quả: view file `tasks/.tmp/deps-check.md`
→ Thông báo user: "Task XX done! Next available: task YY (✅ READY)"
