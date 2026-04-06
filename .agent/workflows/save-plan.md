---
description: Save the current implementation plan to the plan/ directory with a standardized filename
---

# Save Plan

Lưu implementation plan hiện tại vào thư mục `plan/` theo công thức đặt tên chuẩn.

## Directory Structure

```
plan/
  ├── <lib-name>/                   ← plans cho specific lib
  │   ├── <date>_<topic>_<ver>.md
  │   └── ...
  ├── <general-plan>.md             ← plans general (cross-lib, infra, cicd...)
  └── ...
```

- **Lib-specific plans**: Tạo thư mục `plan/<lib-name>/` (lowercase) rồi bỏ plan vào.
  Ví dụ: `plan/menu/`, `plan/dialog/`, `plan/utils/`
- **General plans**: Để trực tiếp trong `plan/` (không tạo subfolder).
  Ví dụ: `plan/foundation-roadmap.md`, `plan/cicd-pipeline.md`

## Naming Convention

```
plan/<lib-name>/<YYYY-MM-DD>_<topic>_<version>.md   (lib-specific)
plan/<YYYY-MM-DD>_<topic>_<version>.md               (general)
```

- **`<YYYY-MM-DD>`**: Ngày hiện tại (lấy từ system time), ví dụ `2026-03-30`
- **`<lib-name>`**: Tên lib (lowercase), ví dụ `menu`, `dialog`, `theme`, `utils`
- **`<topic>`**: Mô tả ngắn gọn nội dung plan (lowercase, kebab-case), ví dụ `enhance`, `colorscheme`, `keyboard`
- **`<version>`**: Version của plan, ví dụ `v0.1`, `v1.0`

## Steps

1. Xác định plan là **lib-specific** hay **general**
   - Nếu plan liên quan đến 1 lib cụ thể → lib-specific
   - Nếu plan cross-lib, infra, cicd → general
2. Xác định **lib name** (nếu lib-specific) hoặc **topic** từ context
3. Xác định **version** từ context (thường lấy từ `package.json` version hoặc nội dung plan, hoặc hỏi user)
4. Lấy **ngày hiện tại** từ system time, format `YYYY-MM-DD`

// turbo
5. Tạo thư mục (nếu lib-specific) và copy file:
```powershell
# Lib-specific
New-Item -ItemType Directory -Path "<workspace>/plan/<lib-name>" -Force
cp "<artifact_dir>/implementation_plan.md" "<workspace>/plan/<lib-name>/<date>_<topic>_<version>.md"

# General
cp "<artifact_dir>/implementation_plan.md" "<workspace>/plan/<date>_<topic>_<version>.md"
```

## Examples

| Context | Path |
|---------|------|
| Menu enhance plan v0.2 on 2026-04-01 | `plan/menu/2026-04-01_enhance_v0.2.md` |
| Menu colorscheme plan v0.1 | `plan/menu/2026-03-31_colorscheme_v0.1.md` |
| Dialog roadmap (general) | `plan/dialog-roadmap.md` |
| Utils useKeyboard plan v0.1 | `plan/utils/2026-04-01_useKeyboard_v0.1.md` |
| CI/CD pipeline (general) | `plan/cicd-pipeline.md` |
