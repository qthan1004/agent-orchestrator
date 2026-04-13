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
*(Bắt buộc phải ghi rõ quy luật vị trí của source code, test files, và stories cho mỗi module. Ví dụ: test files phải nằm ở thư mục `tests/` cấp ngoài cùng của lib thay vì nằm trong `src/lib/`)*
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

## 5. Shared Utilities (Functions / Helpers dùng chung)
*(Liệt kê tất cả utility functions được import across modules)*

| Utility | Package | Mô tả | Ví dụ |
|---------|---------|-------|-------|
| `[tên]` | `[package]` | [...] | `[usage example]` |

## 6. Styling Token Convention (Khi nào dùng token vs hardcode)
*(Document quy tắc sử dụng design tokens từ theme)*

### 6.1. Spacing
- **Tokens available**: [...] (e.g. `spacing.tiny`, `spacing.small`)
- **Rule**: [...] (e.g. "ALWAYS use spacing tokens for gap, padding, margin. NEVER hardcode pxToRem for spacing values.")

### 6.2. Palette Access
- **Pattern**: [...] (e.g. `palette?.[color]?.main` with optional chaining)
- **Rule**: [...]
