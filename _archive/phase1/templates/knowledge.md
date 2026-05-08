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

_(QUY LUẬT BẮT BUỘC: Agent PHẢI tự discovery cấu trúc thực tế của project, KHÔNG được giả định. Với mỗi module/lib đã scan, Agent phải ghi rõ VỊ TRÍ CHÍNH XÁC của: source code, test files, stories, config files. Đây là binding convention cho toàn bộ task sau này.)_

### 3.1. Project-level Structure

```
[Điền sau khi discovery — ví dụ:]
<workspace_root>/
├── [top-level-dir-1]/    # mô tả
├── [top-level-dir-2]/    # mô tả
└── [config files]        # mô tả
```

### 3.2. Module/Lib Structure (rút ra từ scan thực tế)

```
[Điền tree chuẩn mà project đang dùng — scan ít nhất 2-3 module/lib rồi rút ra pattern chung]
```

### 3.3. File Placement Convention (CRITICAL — phải điền chính xác)

| Loại file | Vị trí chính xác | Ví dụ (từ module đã scan) |
|-----------|-------------------|---------------------------|
| Source code | [...] | [...] |
| **Test files** (`*.spec.*`, `*.test.*`) | [...] | [...] |
| **Stories** (`*.stories.*`) | [...] | [...] |
| Barrel export | [...] | [...] |
| Styled components | [...] | [...] |
| Models/Types | [...] | [...] |
| Config files | [...] | [...] |

> **CRITICAL**: Dòng "Test files" và "Stories" PHẢI được điền chính xác sau khi `list_dir` ít nhất 2 module thực tế. Vị trí này trở thành BINDING CONVENTION — mọi task tạo mới/sửa test PHẢI đặt đúng vị trí đã ghi ở đây. TUYỆT ĐỐI KHÔNG tự suy diễn hay đặt chỗ khác.

## 4. Architecture Conventions & Gotchas (Luật thiết kế & Lỗi cần tránh)

_(Lưu ý: Bạn phải rút ra nguyên tắc chung cho từng Nhóm Kỹ Thuật, KHÔNG nhóm theo tên Từng Component)_

### 4.1. [Tên Nhóm Kỹ Thuật 1, ví dụ: Form Controls]

- **Issue/Context**: [...]
- **Mandatory Rule**: [...]

### 4.2. Styled Components (Emotion) & CSS-in-JS
- **Issue/Context**: [...]
- **Mandatory Rule**: [...] (e.g. Always import `useTheme` and `styled` from `@emotion/react`. Never import them from the internal UI library unless explicitly required.)

### 4.3. Component Testing 
- **Issue/Context**: [...]
- **Mandatory Rule**: [...] (e.g. Always wrap components in test files using `import { ThemeProvider } from '@your-internal-lib'`. NEVER import `ThemeProvider` from `@emotion/react` directly.)

## 5. Shared Utilities (Functions / Helpers dùng chung)

_(Liệt kê tất cả utility functions được import across modules)_

| Utility | Package     | Mô tả | Ví dụ             |
| ------- | ----------- | ----- | ----------------- |
| `[tên]` | `[package]` | [...] | `[usage example]` |

## 6. Styling Token Convention (Khi nào dùng token vs hardcode)

_(Document quy tắc sử dụng design tokens từ theme)_

### 6.1. Spacing

- **Tokens available**: [...] (e.g. `spacing.tiny`, `spacing.small`)
- **Rule**: [...] (e.g. "ALWAYS use spacing tokens for gap, padding, margin. NEVER hardcode pxToRem for spacing values.")

### 6.2. Palette Access

- **Pattern**: [...] (e.g. `palette?.[color]?.main` with optional chaining)
- **Rule**: [...]
