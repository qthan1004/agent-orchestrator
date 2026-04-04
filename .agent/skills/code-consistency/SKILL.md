---
name: code-consistency
description: Quy tắc nhất quán cho source code — patterns, naming, error handling, imports
---
# Code Consistency

> Tạm dùng. Remove sau khi build xong.
> **Trước khi code**: `node tools/code-index.mjs` → view `tasks/.tmp/code-index.md`

## Naming
| Item | Style | Ví dụ |
|------|-------|-------|
| Files | `kebab-case.mjs` | `file-backend.mjs` |
| Classes | `PascalCase` | `WorkerRegistry` |
| Functions/Vars | `camelCase` | `getNextTask` |
| Constants | `UPPER_SNAKE` | `MAX_RETRIES` |
| Log events | `UPPER_SNAKE` | `TASK_ASSIGNED` |

## Imports
```javascript
// 1. Node built-in → 2. npm → 3. local (relative + .mjs extension)
import { join, dirname } from 'path';
import { z } from 'zod';
import { loadConfig } from '../config.mjs';
```
❌ No `require()`, no missing `.mjs` extension, no default imports khi có named exports

## Cross-Platform
```javascript
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(ROOT, 'exchange', 'inbox', 'task.json');
```
❌ No hardcode `/` `\\`, no `process.platform`, no shell commands (`mv`, `cp`)

## Error Handling
- **Utils**: return `null`/`false` on error (caller decides)
- **MCP tools**: `try/catch` → `{ isError: true }` on failure
- ❌ No throw in utils, no silent swallow

## Patterns
- **File write**: `atomicWrite()` — write `.tmp` → `rename` (atomic)
- **MCP response**: return `{ file_path }` (relative) — agent dùng `view_file()`
- **Logging**: `logger.log(EVENT, data)` — no `console.log` for business logic
- **Config**: `loadConfig()` — no hardcode paths

## Pre-commit Check
- [ ] Local imports có `.mjs` extension
- [ ] Paths dùng `path.join()`
- [ ] Data writes dùng `atomicWrite`
- [ ] MCP responses dùng relative `file_path`
- [ ] File naming `kebab-case.mjs`
