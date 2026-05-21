# SYSTEM ARCHITECTURE & CORE PROJECTS PORTFOLIO

Tài liệu này tổng hợp kiến trúc hệ thống và giải pháp kỹ thuật của các dự án cốt lõi (Core Projects), tập trung vào tối ưu hóa hiệu suất, quản lý luồng dữ liệu quy mô lớn và tự động hóa quy trình.

---

## 1. Autonomous Agent Orchestrator
**Mô tả:** Hệ thống điều phối AI Agent tự trị, đóng vai trò "Tổng tư lệnh" phân rã và thực thi các luồng công việc phát triển phần mềm phức tạp.
**Tình trạng:** Phase 2 Implementation.

*   **Kiến trúc Waterfall & One-Way Binding:** Áp dụng luồng dữ liệu một chiều nghiêm ngặt cho pipeline của các Agent. Đầu ra (Output) của Agent trước là đầu vào (Input) bất biến của Agent sau, triệt tiêu vòng lặp vô tận và đảm bảo tính dự đoán được của luồng xử lý.
*   **Phân quyền chuyên biệt:** Xây dựng hệ sinh thái Agent với các Role độc lập bao gồm Planner (Lập kế hoạch/Thiết kế kiến trúc), Worker (Thực thi/Code), và QA (Kiểm thử/Review).
*   **Tích hợp Tooling (MCP):** Mở rộng năng lực của Agent thông qua Model Context Protocol, cho phép tương tác trực tiếp và liền mạch với các hệ thống bên ngoài như Figma và GitHub.

## 2. Enterprise-Grade Dynamic Form Engine
**Mô tả:** Thư viện lõi xử lý biểu mẫu (Form) động hiệu năng cao, được thiết kế để giải quyết bài toán "thắt cổ chai" (bottleneck) của các ứng dụng doanh nghiệp có lượng dữ liệu khổng lồ trên một màn hình.

*   **Kiến trúc Pub/Sub (Event-Driven):** Thay thế hoàn toàn cơ chế Re-render Top-Down của React bằng hệ thống Event-driven. Triệt tiêu hoàn toàn input-lag khi xử lý đồng thời hơn **1.000 fields**; trạng thái chỉ cập nhật cục bộ tại những Node Subscribe tương ứng.
*   **Dynamic Rule Engine:** Tách rời hoàn toàn logic kiểm tra (Validation) và quy tắc đan chéo (Cross-rules) ra khỏi View. Xử lý song song hơn **1.000 rules** phức tạp mà không làm nghẽn Main Thread của trình duyệt.
*   **Plugin Pattern (Open-Closed Principle):** Lõi hệ thống đóng vai trò điều phối dòng chảy dữ liệu. Các UI Components tùy chỉnh và các bộ Rule phức tạp được nhúng vào dưới dạng Plugin, cho phép khả năng mở rộng vô hạn mà không can thiệp vào Source Code lõi.

## 3. High-Performance Page Builder (Hybrid Wasm Core)
**Mô tả:** Nền tảng xây dựng giao diện (Page Builder) xử lý hàng triệu điểm dữ liệu đồ họa (Data Points) ở tốc độ 60 FPS bằng cách viết lại hoàn toàn cơ chế quản lý bộ nhớ của trình duyệt.

*   **Microservice In-Browser (Go/WebAssembly):** Tách biệt hệ thống thành 2 lớp. Lõi Engine được viết bằng **Golang** biên dịch sang **WebAssembly**, đóng vai trò là "Single Source of Truth" (Lưu trữ và tính toán). UI Layer (React) hoạt động như một "Dumb View" (Màn hình câm) chỉ nhận và hiển thị ID tham chiếu.
*   **Isolated In-Memory Caching:** Xây dựng cơ chế "Redis nội bộ" ngay bên trong Wasm RAM để cache các JSON projection. Kết hợp thuật toán Viewport Culling và Lazy Query để giới hạn lượng dữ liệu truyền tải qua Bridge xuống mức siêu nhẹ (vài KB cho mỗi khung hình), bỏ qua Garbage Collector của JavaScript.
*   **Zero JS Caching & Black-box Interface:** Giao tiếp Wasm - JS thông qua luồng API nghiêm ngặt (Mutate/Query). Khi có đột biến dữ liệu, Wasm gửi tín hiệu CDC (Change Data Capture) để UI tự động kéo bản Snapshots mới nhất, xóa bỏ hoàn toàn rủi ro Out-of-sync.

## 4. System Core UI Workspace
**Mô tả:** Hệ sinh thái Component và Design System cốt lõi, thiết lập tiêu chuẩn giao diện và tính nhất quán cho các dự án vệ tinh.

*   **Kiến trúc Monorepo:** Quy hoạch và quản lý tập trung mã nguồn tại tổ chức `system-core-ui` và workspace `react-lib-workspace`, tối ưu hóa quy trình chia sẻ code và CI/CD.
*   **Core UI Library (@thanh-libs):** Xây dựng bộ thư viện nền tảng cung cấp các thành phần giao diện từ nguyên thủy đến phức tạp (Chips, Tabs, Cards...). Đảm bảo tính nhất quán (Reuse consistency) và tuân thủ chặt chẽ các nguyên tắc tái sử dụng trong phát triển FE thuần.