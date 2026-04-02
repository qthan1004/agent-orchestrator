---
description: Test manual các lib thông qua Storybook — duyệt stories, ghi log, report bugs
---

# Test Lib (Manual via Storybook)

Khi user gọi `/test-lib <lib-name>`, bạn sẽ test thủ công lib đó qua Storybook.

**Ví dụ:** `/test-lib menu`, `/test-lib dialog`, `/test-lib button`

---

## Step 1 — Xác định lib & thu thập context

1a. Lấy `<lib-name>` từ lệnh user (ví dụ: `menu`, `dialog`, `chip`).
Nếu không cung cấp → hỏi user.

1b. Xác nhận thư mục lib tồn tại:
```
libs/<lib-name>/
```

// turbo
1c. Đọc source code chính của lib để hiểu API:
```bash
find "libs/<lib-name>/src" -type f \( -name "*.tsx" -o -name "*.ts" \) ! -name "*.stories.*" ! -name "*.spec.*" ! -name "*.test.*" | sort
```

// turbo
1d. Đọc story files để biết có những story nào:
```bash
find "libs/<lib-name>/src" -name "*.stories.*" -type f
```

1e. Đọc nội dung từng story file để hiểu test scenarios.

// turbo
1f. Đọc existing tests (nếu có) để biết đã cover gì:
```bash
find "libs/<lib-name>" -name "*.spec.*" -o -name "*.test.*" | sort
```

Đọc nội dung các test file để nắm scope đã test.

## Step 2 — Kiểm tra Storybook host

Kiểm tra xem Storybook đã chạy sẵn chưa bằng cách thử truy cập:

// turbo
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:6006
```

- **Nếu trả về `200`** → Storybook đã chạy, **KHÔNG cần start lại**. Truy cập trực tiếp `http://localhost:6006`.
- **Nếu KHÔNG trả về `200`** → Start Storybook:
```bash
yarn storybook
```
Chờ đến khi server sẵn sàng (port 6006 active).

## Step 3 — Tạo test plan

Dựa trên stories và source code đã đọc, tạo danh sách **test cases** bao gồm:

### 3a. Test cases từ Stories
Mỗi story export = 1 nhóm test. Ví dụ với `Menu`:
- `Basic` → render cơ bản, click items
- `States` → selected, disabled, danger states
- `Grouped` → MenuGroup với label
- `WithSubMenus` → inline toggle expand/collapse
- `PopoverSubMenus` → popover mode hover/click
- `KeyboardNavigation` → Arrow keys, typeahead
- ...

### 3b. Test cases bổ sung (cross-cutting)
- **Keyboard navigation**: Tab, Arrow keys, Enter, Escape, Home, End
- **Accessibility**: ARIA roles, labels, screen reader
- **Responsive**: Resize viewport
- **Edge cases**: Empty states, overflow, rapid clicks
- **Console errors**: Kiểm tra React warnings, runtime errors
- **Visual**: Alignment, spacing, animation chạy mượt

### 3c. Hiển thị test plan cho user

Hiển thị bảng test plan:
```
## 🧪 Test Plan: <lib-name>

| # | Story / Scenario        | Test Cases                                    | Status |
|---|-------------------------|-----------------------------------------------|--------|
| 1 | Basic                   | Render, click handler fires                   | ⬜     |
| 2 | States                  | Selected highlight, disabled no-click, danger  | ⬜     |
| 3 | Keyboard Navigation     | Arrow, Tab, Enter, Escape, typeahead           | ⬜     |
| ...                                                                                     |

---
👉 Bắt đầu test? (Y/n)
```

Chờ user confirm trước khi test.

## Step 4 — Thực hiện test qua Browser

Dùng `browser_subagent` để truy cập Storybook và test từng story.

### Flow cho mỗi story:

4a. **Navigate** tới story trong Storybook sidebar:
- URL pattern: `http://localhost:6006/?path=/story/<story-path>`
- Ví dụ: `http://localhost:6006/?path=/story/menu-menu--basic`

4b. **Visual check**:
- Screenshot để xác nhận render đúng
- Kiểm tra layout, spacing, colors

4c. **Interaction test**:
- Click các items, hover, focus
- Keyboard navigation (nếu applicable)
- Kiểm tra transitions/animations

4d. **Console check**:
- Mở browser console (F12)
- Check React warnings, errors

4e. **Ghi kết quả** cho từng test case: ✅ PASS / ❌ FAIL / ⚠️ WARNING

### Lưu ý khi dùng browser_subagent:
- Mỗi lần gọi browser_subagent, test **1-2 stories** rồi return kết quả
- Recording name pattern: `test_<lib>_<story>`
- Nếu tìm thấy bug → screenshot ngay, ghi chi tiết

## Step 5 — Tổng hợp kết quả

Sau khi test xong tất cả stories, tạo **test log artifact**:

### 5a. Test Log file

Tạo file: `plan/test-logs/<YYYY-MM-DD>_<lib-name>_manual-test.md`

Format:
```markdown
# Manual Test Log: <Lib Name>

**Date:** <YYYY-MM-DD>
**Lib:** `@thanh-libs/<lib-name>`
**Storybook:** http://localhost:6006
**Tester:** AI Agent

## Summary

| Total | ✅ Pass | ❌ Fail | ⚠️ Warning |
|-------|---------|---------|------------|
| XX    | XX      | XX      | XX         |

## Test Results

### 1. <Story Name>
| # | Test Case            | Result | Notes              |
|---|----------------------|--------|--------------------|
| 1 | Render correctly     | ✅     |                    |
| 2 | Click handler fires  | ✅     |                    |
| 3 | Keyboard nav         | ❌     | Arrow keys not working |

### 2. <Next Story>
...

## Screenshots

![<description>](<path-to-screenshot>)

## Console Errors

(List any React warnings or runtime errors observed)
```

// turbo
```bash
mkdir -p "plan/test-logs"
```

## Step 6 — Ghi bug report (nếu có FAIL)

Nếu có bất kỳ test case nào ❌ FAIL:

6a. Kiểm tra file bug report cho ngày hôm nay đã tồn tại chưa:
```
plan/bugs/<YYYY-MM-DD>_<lib-name>_<version>.md
```

- `<YYYY-MM-DD>`: Ngày hiện tại từ system time
- `<lib-name>`: Tên lib (lowercase, no prefix), ví dụ `menu`, `dialog`
- `<version>`: Lấy từ `libs/<lib-name>/package.json` → field `version`, format `v<major>.<minor>` (bỏ patch)

6b. **Nếu file đã tồn tại** → Append bugs mới vào cuối file (trước dòng `*(Append...)*`), tăng số thứ tự bug.

6c. **Nếu file chưa tồn tại** → Tạo file mới theo format:

```markdown
# <Lib Name> Library Bug Report

**Date:** <YYYY-MM-DD>
**Module:** `<lib-name>`
**Version:** `<version>`

## 🔴 Critical (Feature hoàn toàn hỏng)

### 1. <Bug Title>
* **Status:** Open
* **Story:** <Story name where found>
* **File**: `<source file>`
* **Description:** <Mô tả chi tiết>
* **Steps to reproduce:**
  1. ...
  2. ...
* **Expected:** ...
* **Actual:** ...

---

## 🟡 Major (Hành vi sai / thiếu kết nối)

---

## 🟢 Minor (Edge case / polish)

---

*(Append new findings for the day below)*
```

6d. Phân loại severity:
- **🔴 Critical**: Feature hoàn toàn hỏng, crash, data loss
- **🟡 Major**: Hành vi sai nhưng có workaround, missing connection
- **🟢 Minor**: Edge case, UI polish, cosmetic issues

## Step 7 — Báo kết quả cho User

Hiển thị tóm tắt:

```
## 🧪 Test Report: <lib-name>

✅ Passed: X/Y test cases
❌ Failed: X/Y test cases  
⚠️ Warnings: X

📄 Test log: plan/test-logs/<date>_<lib>_manual-test.md
🐛 Bug report: plan/bugs/<date>_<lib>_<version>.md (nếu có bugs)

### Failed Tests:
| Story         | Test Case         | Severity |
|---------------|-------------------|----------|
| PopoverSubs   | Hover trigger     | 🔴       |
| IconDisplay   | Hide text labels  | 🔴       |

### Recordings:
- test_menu_basic (xx giây)
- test_menu_popover (xx giây)
```

---

## Lưu ý quan trọng

- **KHÔNG sửa code** trong workflow này. Chỉ test và report.
- Nếu Storybook đã chạy sẵn (có terminal `yarn storybook` đang running) → **KHÔNG start lại**, truy cập trực tiếp.
- Mỗi bug cần có: title, file gây lỗi, description, steps to reproduce, và severity.
- Screenshots bugs nên được lưu lại qua browser recording.
- Nếu lib không có story files → báo user và đề xuất tạo stories trước.
