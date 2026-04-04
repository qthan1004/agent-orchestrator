---
description: Complete current task — verify, tick done criteria, move to done/, commit
---

# Complete Task

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

1. Kiểm tra tasks/processing/ — lấy task đang làm:
```powershell
ls tasks/processing/
```
Nếu empty → thông báo "Không có task đang processing" → dừng.

2. Đọc task file trong processing/

3. Chạy **Verification** commands từ task file

4. Check từng **Done Criteria** — xác nhận tất cả đã hoàn thành

5. Nếu có tiêu chí CHƯA đạt → liệt kê chi tiết và hỏi user muốn tiếp tục complete hay fix trước

6. Update task file: tick tất cả Done Criteria thành `[x]`

7. Move task sang done:
```powershell
Move-Item "tasks/processing/<task-file>" "tasks/done/"
```

8. Update `tasks/README.md`:
   - Đổi task status từ ⬜ Pending → ✅ Done
   - Update counts ở đầu file
   - Cập nhật path file (pending/ → done/)

9. Git commit:
```powershell
git add tasks; git commit -m "feat(orchestrator): complete task XX — <title>"
```

10. Thông báo cho user: "Task XX done! Next available: task YY"
