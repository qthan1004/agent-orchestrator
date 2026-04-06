---
description: Stage changes, commit theo Conventional Commits convention, và push lên Git remote.
---

# Push Git

Đẩy code lên Git theo đúng convention (ref: skill `git-commit-convention`).

> **Cross-platform:** Workflow này dùng `git` CLI (có sẵn trên cả Linux và Windows).

## Các bước

### 1. Kiểm tra trạng thái
// turbo
```bash
git status --short
```
→ Xem có thay đổi gì không. Nếu **clean** (không có output) → dừng, báo "Không có gì để push."

### 2. Xem diff chi tiết
// turbo
```bash
git diff --stat
```
→ Xem tổng quan các file đã thay đổi để xác định đúng `type` và `scope` cho commit message.

### 3. Stage changes

```bash
git add -A
```

### 4. Tạo commit message theo convention

**Format:** `<type>(<scope>): <subject>`

Dựa vào diff ở bước 2, xác định:

| Type | Khi nào dùng |
|------|-------------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `refactor` | Refactor code (không thêm feature, không fix bug) |
| `docs` | Chỉ thay đổi documentation |
| `chore` | Build, tooling, config, dependencies |
| `test` | Thêm/sửa test |
| `style` | Format code (không đổi logic) |
| `perf` | Cải thiện performance |

**Scope** (optional): module/area bị ảnh hưởng (vd: `server`, `state-manager`, `tools`, `config`).

**Subject**: imperative present tense, không viết hoa chữ đầu, không dấu chấm cuối.

```bash
git commit -m "<type>(<scope>): <subject>"
```

**Ví dụ:**
```bash
git commit -m "feat(server): add long-poll support for get_next_task"
git commit -m "fix(state-manager): handle race condition in moveToActive"
git commit -m "docs: update README with multi-session setup"
git commit -m "chore(tools): add health-check script"
```

### 5. Push lên remote

```bash
git push
```

Nếu push lần đầu hoặc branch chưa có upstream:
```bash
git push -u origin <branch-name>
```

### 6. Xác nhận
// turbo
```bash
git log --oneline -1
```
→ In commit mới nhất để xác nhận.

Báo cáo:
```
✅ Pushed: <commit message>
   Branch: <branch-name>
   Files changed: <số file>
```
