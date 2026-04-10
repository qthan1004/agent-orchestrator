# Agent Orchestrator: Architecture Philosophy & Guiding Principles

## 1. Mù tịt nhưng Cơ bắp (The Zero-Knowledge Engine)
Agent Orchestrator được thiết kế thuần túy như một cỗ máy (State Machine) quản lý phân phối công việc. Orchestrator **tuyệt đối không biết và không quan tâm** đến nội dung của công việc hay ngôn ngữ lập trình của dự án đích.

**Nhiệm vụ duy nhất của Orchestrator:**
- Di chuyển file trạng thái giữa `inbox/`, `active/`, `outbox/`.
- Giải quyết ràng buộc đồ thị (DAG Resolution): Tự động unlock các task khi các dependency của nó đã hoàn thành.
- Quản lý Worker, Recovery & Polling: Theo dõi worker crash/timeout để thu hồi và requeue task.

Bạn có thể cắm Orchestrator vào một dự án React/NodeJS, hoặc cắm nó vào một hệ thống quản lý xưởng may – đối với Orchestrator, tất cả đều chỉ là đồ thị (Graph) và Data stream. Codebase của Orchestrator **không bao giờ** được chứa logic liên quan đến Tech-Stack hay Business Logic của dự án đích.

## 2. Workspace-Root là Thế Giới (The World Model)
Mọi sự thật, convention, cấu trúc – nằm hoàn toàn tại `workspace-root` của dự án được target.
- Orchestrator không lưu trữ tri thức (knowledge) hay bối cảnh dự án bên trong server của mình.
- Tri thức chung (như file bạn đang đọc) hay tri thức về chính dự án mục tiêu phải được đặt tại `.agent/knowledge/` bên trong workspace đó.
- Lợi ích: Orchestrator trở nên stateless hoàn toàn so với Project. Zero-coupling.

## 3. Thực thể nhận thức (The Intelligence)
Sự thông minh nằm toàn bộ ở **Agents** (Planner & Worker) thông qua LLM.
- Agent đóng vai "thợ" tới xưởng lãnh việc.
- Khi nhận 1 task từ Orchestrator, Agent không tự bịa ra code, mà nó dùng trí thông minh của mình để mở file, đọc code cũ, và đặc biệt là **tự quét thư mục `.agent/knowledge/` ở workspace-root** để học hỏi luật lệ và stack của dự án.
- Sau khi học xong (Pre-flight), nó mới vác xẻng (Code Editors/Terminal) ra sửa file.

> **TÌNH HUỐNG LÝ TƯỞNG:** Nếu một Planner vào 1 dự án trắng tinh và không thấy `.agent/knowledge/`, nó sẽ tự động scan `package.json`, đọc `src/` và TỰ SINH RA các file knowledge này để các Worker theo sau đọc và tuân thủ. Hệ thống hoàn toàn tự định tuyến và học hỏi.
