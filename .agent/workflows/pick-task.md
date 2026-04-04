---
description: Pick next available task from pending/ — check dependencies, move to processing
---
# Pick Task

1. Check processing empty:
// turbo
```powershell
Get-ChildItem tasks/processing/ -Filter *.md -Name -ErrorAction SilentlyContinue
```
Có task → "Complete task trước" → dừng.

2. Check dependencies:
// turbo
```powershell
node tools/check-deps.mjs
```

3. View `tasks/.tmp/deps-check.md` → chọn task ✅ READY số nhỏ nhất

4. Move:
```powershell
Move-Item "tasks/pending/<task>" "tasks/processing/"
```

5. Đọc task file → thông báo user
