---
description: Show current task board status — pending, processing, done counts
---

# Task Status

> ⚠️ Workflow tạm cho development. Remove sau khi build xong.

// turbo-all

1. Đếm tasks trong mỗi directory:
```powershell
Write-Host "=== TASK BOARD ===" ; Write-Host "Pending:" ; (Get-ChildItem tasks/pending/ -Filter *.md | Measure-Object).Count ; Get-ChildItem tasks/pending/ -Filter *.md -Name ; Write-Host "`nProcessing:" ; (Get-ChildItem tasks/processing/ -Filter *.md -ErrorAction SilentlyContinue | Measure-Object).Count ; Get-ChildItem tasks/processing/ -Filter *.md -Name -ErrorAction SilentlyContinue ; Write-Host "`nDone:" ; (Get-ChildItem tasks/done/ -Filter *.md -ErrorAction SilentlyContinue | Measure-Object).Count ; Get-ChildItem tasks/done/ -Filter *.md -Name -ErrorAction SilentlyContinue
```

2. Hiển thị bảng tổng hợp cho user theo format:

```
📋 Task Board — Agent Orchestrator POC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⬜ Pending:    X tasks
🔄 Processing: Y tasks
✅ Done:       Z tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:         N tasks

Next available: <task name> (nếu có)
```
