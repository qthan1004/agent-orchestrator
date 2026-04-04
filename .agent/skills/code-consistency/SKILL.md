---
name: code-consistency
description: Quy tắc nhất quán cho source code — patterns, naming, error handling, imports
---

# Code Consistency

> ⚠️ Skill tạm dùng cho development. Remove sau khi build xong.
> **Mỗi task PHẢI đọc skill này trước khi viết code.**

## Trước khi code — Chạy Code Index

```powershell
node tools/code-index.mjs
```
→ Đọc `tasks/.tmp/code-index.md` bằng `view_file()` → nắm codebase hiện tại.
→ Đảm bảo code mới **nhất quán** với code đã có.

## 1. File Structure

```javascript
// === Thứ tự trong mỗi file .mjs ===

// 1. Imports — Node.js built-in trước, rồi npm, rồi local
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { loadConfig } from '../config.mjs';

// 2. Constants
const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG = loadConfig();

// 3. Class hoặc Functions
export class MyClass { ... }
export function myFunction() { ... }

// 4. Main execution (nếu là entry point)
// Chỉ ở index.mjs hoặc CLI scripts
```

## 2. Naming Convention

| Item | Convention | Ví dụ |
|------|-----------|-------|
| Files | `kebab-case.mjs` | `file-backend.mjs`, `task-queue.mjs` |
| Classes | `PascalCase` | `WorkerRegistry`, `StateManager` |
| Functions | `camelCase` | `getNextTask()`, `atomicWrite()` |
| Constants | `UPPER_SNAKE` | `MAX_RETRIES`, `DEFAULT_PORT` |
| Variables | `camelCase` | `taskId`, `workerCount` |
| Private | `_camelCase` | `_sessions`, `_queue` |
| Events/Log | `UPPER_SNAKE` | `TASK_ASSIGNED`, `SERVER_START` |

## 3. Imports — PHẢI nhất quán

```javascript
// ✅ Luôn dùng named imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { join, resolve } from 'path';

// ✅ Local imports dùng relative path + extension
import { loadConfig } from '../config.mjs';
import { atomicWrite } from '../utils/file-backend.mjs';

// ❌ KHÔNG dùng default import cho modules có named exports
// ❌ KHÔNG quên extension .mjs trong local imports
// ❌ KHÔNG dùng require()
```

## 4. Cross-Platform — 1 Solution

```javascript
// ✅ Paths
import { join, resolve, dirname } from 'path';
const filePath = join(ROOT, 'exchange', 'inbox', taskFile);

// ✅ __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url));

// ✅ File operations — Node.js fs API only
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';

// ❌ KHÔNG hardcode '/' hoặc '\\'
// ❌ KHÔNG process.platform, os.platform()
// ❌ KHÔNG shell commands (mv, cp, rm)
```

## 5. Error Handling Pattern

```javascript
// ✅ Pattern: Return null/false khi fail (utils)
export function readJSON(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;  // Caller decides what to do
  }
}

// ✅ Pattern: isError flag cho MCP tools
server.tool('my_tool', '...', schema, async (args) => {
  try {
    const result = doSomething(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ❌ KHÔNG throw trong utility functions
// ❌ KHÔNG swallow errors silently — log hoặc return indicator
```

## 6. Atomic Write Pattern

```javascript
// ✅ LUÔN dùng atomic write cho data files
import { writeFileSync, renameSync } from 'fs';

export function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, filePath);
}

// ❌ KHÔNG writeFileSync trực tiếp cho important data
```

## 7. MCP Tool Response

```javascript
// ✅ Trả file_path — agent đọc bằng view_file (token-saving)
return {
  content: [{ type: 'text', text: JSON.stringify({
    task_id: '01',
    file_path: 'exchange/active/01-setup.task.json'  // RELATIVE path
  })}]
};

// ✅ Status/simple data — trả inline JSON nhỏ
return {
  content: [{ type: 'text', text: JSON.stringify({
    total: 5, done: 2, active: 1
  })}]
};

// ❌ KHÔNG trả full task content qua MCP (waste tokens)
// ❌ KHÔNG dùng absolute paths trong response
```

## 8. Logging

```javascript
// ✅ Dùng logger.mjs cho structured events
logger.log('TASK_ASSIGNED', { task_id: '01', worker_id: 'w-abc123' });

// ✅ Console.log chỉ cho server startup/shutdown banners
console.log('MCP Server listening on http://127.0.0.1:3847/mcp');

// ❌ KHÔNG console.log cho business logic
// ❌ KHÔNG external logging libraries
```

## 9. Config Access

```javascript
// ✅ Luôn qua loadConfig()
import { loadConfig } from '../config.mjs';
const config = loadConfig();
const inboxDir = config.exchange.inbox;

// ❌ KHÔNG hardcode paths
// ❌ KHÔNG construct paths manually khi config có sẵn
```

## 10. Checklist — Trước mỗi commit

Trước khi complete task, check:

- [ ] Chạy `node tools/code-index.mjs` → verify imports nhất quán
- [ ] Tất cả local imports có extension `.mjs`
- [ ] Tất cả paths dùng `path.join()` — không hardcode
- [ ] Error handling: return null (utils) hoặc isError (MCP tools)
- [ ] Data writes dùng atomicWrite
- [ ] MCP responses dùng relative file_path
- [ ] Không có `console.log` ngoài startup/shutdown
- [ ] File naming: `kebab-case.mjs`
- [ ] No `require()`, no `__dirname` direct (dùng `import.meta.url`)
