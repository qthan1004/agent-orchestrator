# [Enhancement] Auto-Initialized Workspace Knowledge Base

Mục tiêu chính: Cung cấp thuật toán "Smart Scan", "Lazy Loading" và "Anti-Bloat" cho Planner. Planner sẽ tự động quản lý tri thức của project đích tại `<workspace_root>/.agent/knowledge/` thông qua hệ thống theo dõi trạng thái vật lý (`MANIFEST.md`). Mọi thứ được lưu trữ tĩnh ở Repository gốc, và hệ thống Orchestrator giữ nguyên bản chất phi trạng thái (Zero-Coupling/Stateless).

## Proposed Changes (Cập nhật file `agent-prompt.md`)

Chúng ta sẽ thiết kế lại toàn bộ rễ nhận thức của Planner tại Bước 3A:

### 1. Cập nhật Section P - Bước 3A: Workspace Discovery (The Smart Scan)

Planner sẽ áp dụng luồng logic kiểm kê chuyên nghiệp gồm 4 bước:

- **Bước 3A.1: Khởi tạo/Đọc định danh (Manifest)**
  - Tìm `<workspace_root>/.agent/knowledge/MANIFEST.md`.
  - Nếu chưa có: Tạo mới cấu trúc chuẩn gốc.

- **Bước 3A.2: Quyết định Phá Cache (Hybrid Invalidation Logic)**
  Làm sao để biết khi nào cần đè tri thức mới, khi nào dùng tri thức cũ?
  - **Theo Mã Băm (Hash/Git):** Bắt buộc Planner phải check biến động bằng `git log -1 --format="%H" -- <path_to_module>` hoặc checksum directory. Nếu mã khác với mã lưu trong Manifest → module đã bị con người sửa → Phá cache và quét lại.
  - **Theo Ngữ Nghĩa (Intent-based):** Nếu mô tả của User Plan mang những cờ như `Refactor`, `Upgrade`, `Migrate` → Buộc quét lại module đó không cần màng tới Hash.

- **Bước 3A.3: Nạp Tri thức Cục bộ (Lazy Scan & Anti-Bloat)**
  - **Không quét toàn bộ Monorepo:** Chỉ tập trung vào Module đang tác nghiệp trong Plan hiện tại (VD: `libs/switch`).
  - **Quản lý vĩ mô (Anti-Bloat):** `MANIFEST.md` cực kỳ mỏng, chỉ lưu ở cấp độ Module gốc (VD: `[x] libs/switch (hash: 1a2b3c)`). KHÔNG lưu ở cấp độ file để chống phình tệp Manifest làm tốn token rác. Chi tiết tri thức sẽ được "tản ra" viết vào các file chuyên biệt như `libs-switch.md`.
  - **Cache Hit:** Nếu Module đã được quét và Hash khớp → Đọc thẳng file md tri thức, bỏ qua việc ngụp lặn vào `src/` đọc code.

- **Bước 3A.4: Hợp nhất Tỉ mỉ (Meticulous Merge)**
  - Khi bắt buộc phải quét sâu để update, tuyệt đối không được xóa đè trắng trợn kiến thức cũ. Nhiệm vụ của Planner là gộp (Merge) thông tin từ code thực tế vào tri thức hiện hành để ra bản cập nhật chuẩn xác nhất.

### 2. Cập nhật Section W - Pre-flight (Worker Role)
Worker chỉ là "Thợ" và "Hưởng xái" từ Planner:
- Worker bị khóa quyền không cần care tới Manifest. Thêm luật bắt buộc (Mandatory): "Luôn đọc nhanh các thư mục `.agent/knowledge/` trước khi viết code để giữ nguyên architecture & codebase conventions."

### 3. Cập nhật Cấu trúc mẫu (Phụ lục B)
- Đổi tên thành **"Workspace Knowledge Management"**.
- Trình bày mẫu format chuẩn của `MANIFEST.md` và nhấn mạnh thiết kế phân tán (chống phình tệp).

---

## Impact Review

1. **Portable (Tính di dộng tuyệt đối):** Manifest trôi nổi cùng Git. Tri thức tự động chia sẻ khắp hệ sinh thái Dev team (làm trên cty/mang về nhà không cần AI phải tính toán lại).
2. **Tiết kiệm token đỉnh cao (Lazy Scan):** Khai phá đâu quét đấy. Module A không bao giờ làm ảnh hưởng token đọc Module B.
3. **Mỏng nhẹ & Fast Boot (Anti-bloat):** Bằng việc gom nhóm ở cấp độ Bounded Context (Level 1/2 Directory), file Manifest luôn là dạng "mục lục", giữ nhịp độ boot cực kỳ nhanh cho LLM khi phân tích.

---

## Yêu cầu

> File Plan chính thức đã được upload lại vào dev-docs. Nếu bạn hoàn toàn ưng ý với Blueprint này, hãy ra hiệu lệnh để mình bắt tay vào **Chỉnh sửa file `prompts/agent-prompt.md`** ngay bây giờ!
