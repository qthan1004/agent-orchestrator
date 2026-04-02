# [Goal Description]
Phát triển một công cụ dòng lệnh (CLI - `agent-core-cli`) để quản lý ranh giới giữa Global Settings và Local Settings cho Agentic Workspace. 

Kế hoạch này triển khai **Phương án 2 (Symlinks + NPM Package)**. Nó sẽ tách rời toàn bộ các kỹ năng (Skills) và luồng công việc (Workflows) mang tính chất chuẩn mực chung (Generic) ra khỏi Monorepo, đóng gói thành một CLI. Khi khởi tạo dự án mới, CLI sẽ thiết lập các **Symlinks (liên kết mềm)** về kho chứa chung thay vì copy & paste, giải quyết triệt để vấn đề trùng lặp dữ liệu.

## User Review Required

> [!IMPORTANT]
> Phương án này sẽ phụ thuộc vào **Symlink (Liên kết mềm)** của hệ thống dựa trên Unix/Linux. Trình duyệt file và AI hoàn toàn đọc được nội dung của Symlink như một file thật. Điều này có nghĩa là khi bạn cập nhật một luật Generic ở kho chứa chung, hệ thống symlink tại hàng chục dự án sẽ được hưởng luật mới ngay lập tức mà không cần pull code lại.

## Proposed Changes

---

### 1. Tạo Core CLI Package (`agent-core-cli`)
Xây dựng một module Node.js độc lập đóng vai trò là "Nhà Kho" chứa quy chuẩn, bao gồm:
- **`template/skills/`**: Chứa các file `testing-patterns.md`, `component-patterns.md`, `strict-scope.md`, `token-optimization.md`, `task-delegation.md`.
- **`template/workflows/`**: Chứa các file `delegate.md`, `execute-task.md`, `pick-task.md`, `save-plan.md`, `save-bug-report.md`, `git-push.md`.
- **`bin/index.js`**: Script NodeJS thực thi lệnh (được public qua `bin` trong package.json).

### 2. Logic Thực thi (Bấm nút là có AI Workspace)
Khi bạn đứng ở thư mục dự án mới và chạy lệnh khởi tạo (ví dụ: `npx @thanh/agent-core init`):
1. Tool sẽ tự động scan tìm đường dẫn cài đặt gốc của package này trên máy tính của bạn.
2. Tự động tạo cấu trúc `.agent/core/` tại dự án hiện tại.
3. Tạo các **Symlinks** trỏ từ `/.agent/core/...` tới thư mục `template/...` của package.
4. Dự án vẫn hoàn toàn có thể tạo thêm `/agent/skills` (cục bộ) để chứa các công cụ đặc thù không ảnh hưởng đến bất kỳ ai.

### 3. Dọn dẹp lại Monorepo hiện tại (`Personal lib`)
Sau khi CLI tool hoàn thiện, phân rã ngược lại thư mục `.agent` hiện tại của bạn:
- [DELETE] Di dời (hoặc xoá bỏ sau khi dời xong) các Generic Skills & Workflows sang Package Core.
- [RETAIN] Chỉ giữ chặt lại nhóm Đặc thù: `check-deps`, `publish-lib`, `create-lib`, `test-lib`, `clear-nexus`.
- Tiến hành thực thi lệnh Init của CLI ngay trên repo này để kết nối ngược lại với Core Package.

## Open Questions & Next Steps

Dựa trên feedback của bạn:
1. **Repository riêng biệt:** Chúng ta sẽ đặt tên repo là **`agent-orchestrator`** (hoặc `agent-cli` nếu mang tính tổng quát) vì nó sẽ chứa luôn hệ thống đa tác vụ và CLI quản lý.
2. **Global CLI (Không phải Dependency):** Tool này là một công cụ hệ thống độc lập, cài đặt global (`npm install -g`), sử dụng giống như `git` hay `docker`, dự án cụ thể không cần biết sự tồn tại của nó dưới dạng NPM package.
3. **Tích hợp:** CLI này sẽ là trái tim chứa toàn bộ (Generic Skills/Workflows) và hệ thống Orchestrate (Claude/Gemini giao tiếp).

> [!WARNING] Cần chỉ định vị trí thư mục
> Bạn muốn khởi tạo repo `agent-orchestrator` này ở vị trí nào trên máy?
> Ví dụ ngay bên ngoài repo hiện tại: `/home/administrator/back up/agent-orchestrator`?

Nếu đồng ý vị trí, tôi sẽ bắt đầu Execution:
1. Tạo thư mục mới đó.
2. Khởi tạo một Node CLI Project chuẩn chỉnh ở đó.
3. Chuyển (Move) các Generic file từ `Personal lib` hiện tại sang bộ sậu `template/` của Orchestrator CLI.

## Verification Plan

### Automated / Local Tests
- Di chuyển ra một thư mục rỗng trong `/tmp/test-project/`
- Gọi CLI. Cấp quyền `chmod +x` chạy thử `node bin/index.js init`.
- Kiểm tra bằng lệnh `ls -l` để xác nhận các thư mục/file được tạo đang được highlight dạng Symlink trỏ đích chuẩn xác.

### Manual Verification
- Mở VSCode / Editor với AI tại thư mục test đó.
- Gõ dấu `/` xem danh sách Slash Commands có sổ ra các lệnh `save-plan`, `execute-task` (được đọc đệ quy từ cục Symlink) hay không.
