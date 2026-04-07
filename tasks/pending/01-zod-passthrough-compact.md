# Task 01: Fix Zod passthrough & Token Optimization

## Vấn đề
Zod mặc định "strip" unknown keys, nên xoá mất nội dung quan trọng cùa task (`title`, `what_to_do`, `files`). Need to apply Option C (Compact inline).

## Actions
1. **[MODIFY] `src/mcp-server/tools.mjs`**
   - Sửa schema `TaskDefSchema` -> gọi thêm `.passthrough()` ở cuối đoạn khai báo để giữ toàn bộ fields.
   - Khai báo biến hằng số `STRIP_FIELDS = ['status', 'assigned_to', 'priority', 'metadata', 'dependencies', 'done_criteria'];`.
   - Viết hàm `compactTask(task)` để lọc ra Object không chứa `STRIP_FIELDS`.
   - Apply `compactTask(task)` ở 2 vị trí trả về client:
     + Trong `get_next_task()`.
     + Trong `complete_task()` tự động pickup `nextTask`.
