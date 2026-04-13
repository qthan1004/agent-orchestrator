# OS Crash During Heavy Agent Task Execution

## Info
- **Project**: agent-orchestrator
- **Module**: OS / Kernel
- **Version**: v0.1.0
- **Date**: 2026-04-13

## Symptoms
- Toàn bộ Linux OS bị freeze cứng, sau đó hệ thống tự hard reboot.
- Error xảy ra lặp lại (theo boot list: crash lúc `14:00:03` và `14:01:29`).
- `journalctl` đột ngột bị đứt đoạn không ghi lại được bất cứ stack trace / OOM nào trước khi chết, cho thấy Kernel Panic hoặc treo Hard I/O.

## Findings

### 1. Sự can thiệp của `dcagentupgrader` (ManageEngine)
Tại thời điểm đứt đoạn log `14:00:03`, cronjob của hệ thống vừa kích hoạt tiến trình này với quyền `root` lúc `14:00:01`. Tiến trình này chạy cố định mỗi giờ một lần (`03:00`, `04:00`, ...). Lần crash lúc `14:00:03` trùng khớp tới từng giây với việc cron kết thúc session cho upgrader này. Rất có khả năng sự canh tranh Resource hoặc I/O của phần mềm này làm treo File System / Kernel.

### 2. Dấu hiệu OOM từ `agent-orchestrator`
Dù `journalctl` của OS chết từ `14:00:03`, file log nội bộ của Orchestrator (`exchange/logs/2026-04-13.md`) vẫn tiếp tục ghi nhận sự kiện đến tận `14:00:47`:
```text
14:00:47 — TASK_ACTIVATED
Moved task 2026-04-13_breadcrumb_v0.0.1-04-react-components to active
```
Ngay sau hành động đưa task `04-react-components` vào xử lý, tiến trình bị ngắt hoàn toàn và system có một lần boot mới lúc `14:01:29`. Suy ra: Việc chạy tác vụ React/Vite/Gen code thứ 4 đã đẩy mức sử dụng bộ nhớ/CPU lên đỉnh điểm, khi cộng hưởng với `dcagentupgrader` thì dẫn đến treo toàn hệ thống (Freeze/OOM).

### 3. FileWatcher dồn dập bị Segmentation Fault
Sub-process của môi trường code: 
```text
[UtilityProcess id: 2, type: fileWatcher, pid: 4810]: crashed with code 139 and reason 'crashed'
```
Mã lỗi `139` (SIGSEGV) liên tục xuất hiện. Dù không làm sập OS trực tiếp, nó phản ánh việc hệ thống Inotify (quản lý file system events) đang hoạt động hết công suất và có thể tràn bộ nhớ.

## Action Plan Đề Xuất
1. **Dừng/Vô hiệu hóa tiến trình của bên thứ 3**: Cân nhắc gỡ bỏ (hoặc disable trong cron) `/usr/local/desktopcentralagent/bin/dcagentupgrader` khi đang chạy thực thi Agent tránh sung đột I/O.
2. **Review Concurrency Level**: Hạn chế số lượng Worker chạy cùng lúc. Càng nhiều Worker xử lý plan sẽ dễ dàng chạm mốc Memory Limit của System.
3. **Giảm thiểu tracking I/O**: Các log và metadata file ở folder `exchange/` nếu sinh ra quá nhiều và liên tục sẽ làm chết `fileWatcher`. Có thể setting để ignore những file này trong cấu hình IDE.
