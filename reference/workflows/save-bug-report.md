---
description: Save the current bug report to the plan/bugs/ directory with a standardized filename
---

# Save Bug Report

Lưu bug report hiện tại vào thư mục `plan/bugs/` theo công thức đặt tên chuẩn.

## Naming Convention

```
plan/bugs/<YYYY-MM-DD>_<module>_<version>.md
```

- **`<YYYY-MM-DD>`**: Ngày hiện tại (lấy từ system time), ví dụ `2026-03-30`
- **`<module>`**: Tên module/lib đang làm việc (lowercase, no prefix), ví dụ `menu`, `dialog`, `theme`
- **`<version>`**: Version hiện tại liên quan đến bug, ví dụ `v0.1`, `v1.0`

## Steps

1. Xác định **module name** từ context hiện tại (tên lib đang test)
2. Xác định **version** từ context
3. Lấy **ngày hiện tại** từ system time, format `YYYY-MM-DD`
4. Tạo thư mục `plan/bugs/` nếu chưa có (`mkdir -p plan/bugs`)
5. Tạo hoặc copy file chứa bug report vào `plan/bugs/<date>_<module>_<version>.md`

// turbo
6. Chạy lệnh copy hoặc move:
```bash
mkdir -p "plan/bugs"
cp "<artifact_dir>/bug_report.md" "plan/bugs/<date>_<module>_<version>.md"
```

## Examples

| Context | Filename |
|---------|----------|
| Menu lib bug on 2026-03-30 | `plan/bugs/2026-03-30_menu_v0.1.md` |
| Dialog lib bug v1.0 on 2026-04-15 | `plan/bugs/2026-04-15_dialog_v1.0.md` |
