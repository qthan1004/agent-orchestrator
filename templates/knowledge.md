# Mẫu Kiến thức chuẩn cho Agent

(Đây là file template mẫu của hệ thống Orchestrator, Agent không được thay đổi cấu trúc các heading này. Khi Agent lấy template này về qua GET_TEMPLATE, hãy tự phân tích nội dung dự án và điền vào các vị trí đánh dấu `[...]`)

## 1. Project Topology (Cấu trúc có gì)
- **Repo Type**: [...] (e.g. Polyrepo, Monorepo, System Library)
- **Core Tech Stack**: [...] (e.g. Next.js, Node.js, Vite, React)
- **General Architecture**: [...]

## 2. Tools & Workflows (Có các workflow/script gì)
- **Start/Dev**: [...]
- **Build**: [...]
- **Testing**: [...]
- **Special Agent Workflows**: [...] (nếu nằm trong `.agent/workflows/`)

## 3. Directory Map (Phân chia directory ra sao)
- `src/`: [...]
  - `components/`: [...]
  - `utils/`: [...]
- `tests/`: [...]
- `libs/`: [...]

## 4. Architecture Conventions & Gotchas (Luật thiết kế & Lỗi cần tránh)
*(Lưu ý: Bạn phải rút ra nguyên tắc chung cho từng Nhóm Kỹ Thuật, KHÔNG nhóm theo tên Từng Component)*

### 4.1. [Tên Nhóm Kỹ Thuật 1, ví dụ: Form Controls]
- **Issue/Context**: [...]
- **Mandatory Rule**: [...]

### 4.2. [Tên Nhóm Kỹ Thuật 2, ví dụ: CSS-in-JS Setup]
- **Issue/Context**: [...]
- **Mandatory Rule**: [...]
