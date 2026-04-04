---
description: Start MCP Orchestrator server and verify health
---
# Start Server

1. Health check:
// turbo
```powershell
curl.exe http://localhost:3847/health
```

2. Start server nếu NOT_RUNNING (Connection refused):
```powershell
node src/index.mjs serve &
```

3. Wait + verify chạy lại thành công:
// turbo
```powershell
Start-Sleep -Seconds 2
curl.exe http://localhost:3847/health
```
