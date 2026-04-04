# Create Automation Tools

- **Phase**: B — Skills / Workflows / Templates
- **Goal**: Tạo 4 Node.js tools output MD files (token-saving pattern)

## Files

| Action | Path |
|--------|------|
| NEW | `tools/health-check.mjs` |
| NEW | `tools/queue-status.mjs` |
| NEW | `tools/init-exchange.mjs` |
| NEW | `tools/task-scanner.mjs` |
| MODIFY | `tools/README.md` |

## What to Do

### Nguyên tắc chung
- Mỗi tool output 1 file MD ngắn gọn vào `exchange/.tmp/`
- Agent đọc bằng `view_file()` (rẻ token)
- Tool tự tạo `exchange/.tmp/` nếu chưa tồn tại
- Dùng `import.meta.url` + `path.join()` cho paths

### 1. `tools/health-check.mjs`
- Check `http://127.0.0.1:3847/health` (hoặc port từ arg)
- Output → `exchange/.tmp/health.md`:
  ```markdown
  # Health Check — 2026-04-04 10:00:15
  - **Status**: ✅ Running
  - **Port**: 3847
  - **Uptime**: 45m
  - **Workers**: 2
  ```
- Nếu server không chạy → output status ❌

### 2. `tools/queue-status.mjs`
- Scan `exchange/{inbox,active,outbox}/` → count files
- Output → `exchange/.tmp/queue-status.md`:
  ```markdown
  # Queue Status — 2026-04-04 10:00:15
  | Status | Count | Tasks |
  |--------|-------|-------|
  | Pending | 3 | 01-setup, 02-config, 03-fix |
  | Active | 1 | 04-dialog |
  | Done | 2 | 05-test, 06-polish |
  | **Total** | **6** | |
  ```

### 3. `tools/init-exchange.mjs`
- Tạo directory structure: `exchange/{inbox,active,outbox,checkpoints,logs,.tmp}/`
- Tạo `.gitkeep` trong mỗi dir
- Output confirmation text (không cần MD file)

### 4. `tools/task-scanner.mjs`
- Scan tất cả `.task.json` files trong exchange/
- Parse JSON → extract id, title, status, assigned_to
- Output → `exchange/.tmp/task-scan.md`:
  ```markdown
  # Task Scan — 2026-04-04 10:00:15
  ## Inbox (3 tasks)
  - `01-setup-env` — Setup Environment
  - `02-setup-config` — Setup Config
  ## Active (1 task)
  - `03-fix-menu` — Fix Menu (worker: w-a1b2c3d4)
  ## Outbox (0 tasks)
  ```

### 5. Update `tools/README.md`
- Cập nhật danh sách tools, mô tả input/output

## Constraints

- Đọc skill: `reference/skills/token-optimization/SKILL.md`
- Output MD ngắn gọn, đủ ý — agent đọc 1 lần là hiểu
- Cross-platform paths (`path.join`)
- Không dùng shell commands — dùng Node.js fs API

## Dependencies

- `05-mcp_config-mcp-remote` phải xong trước (cần config.mjs)

## Verification

```bash
node tools/init-exchange.mjs
node tools/health-check.mjs
cat exchange/.tmp/health.md
```

## Done Criteria

- [x] 4 tool files tồn tại, chạy không lỗi
- [x] `init-exchange.mjs` tạo đủ directories
- [x] `health-check.mjs` output MD file đúng format
- [x] `queue-status.mjs` scan được exchange/ dirs
- [x] `task-scanner.mjs` parse được .task.json files
- [x] `tools/README.md` cập nhật
