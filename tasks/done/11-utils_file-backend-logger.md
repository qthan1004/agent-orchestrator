# File Backend + Logger + Exchange Setup

- **Phase**: C — File IPC + Core MCP Tools
- **Goal**: Tạo utilities cho file operations: atomic write, structured MD logging, exchange dirs

## Files

| Action | Path |
|--------|------|
| NEW | `src/utils/file-backend.mjs` |
| NEW | `src/utils/logger.mjs` |
| MODIFY | `src/utils/worker-registry.mjs` |

## What to Do

### 1. `src/utils/file-backend.mjs`

File CRUD utility với atomic write pattern:

```javascript
// Core functions:
atomicWrite(filePath, content)    // write .tmp → rename (atomic)
readJSON(filePath)                // parse JSON, return null nếu fail
writeJSON(filePath, data)         // atomicWrite(JSON.stringify(data, null, 2))
moveFile(from, to)                // rename (atomic move)
ensureDir(dirPath)                // mkdir -p
listFiles(dirPath, ext?)          // list files, optional filter by extension
deleteFile(filePath)              // remove file
```

- Tất cả dùng `path.join()` — cross-platform
- Error handling: return null/false thay vì throw (caller decide)

### 2. `src/utils/logger.mjs`

Structured MD log writer:

```javascript
// Core:
class Logger {
  constructor(logsDir)            // exchange/logs/
  log(event, data)                // append entry vào daily file
  getLogPath()                    // return current day's log file path
}

// Log format (append vào YYYY-MM-DD.md):
// ## HH:MM:SS — EVENT_TYPE
// - Key: value
// - Key: value
```

- Daily rotation: 1 file per day
- Append-only (mở file, append, close)
- Events: `SERVER_START`, `WORKER_REGISTERED`, `TASK_ASSIGNED`, `TASK_COMPLETED`, `DAG_UNLOCK`, `SERVER_SHUTDOWN`, `ERROR`

### 3. Update `worker-registry.mjs`

- Thêm persist: save/load workers từ `exchange/workers.json` (dùng file-backend)
- Dual-write: update memory + write file

## Constraints

- Atomic write = `writeFileSync` tới `.tmp` → `renameSync` (cross-platform atomic)
- Logger KHÔNG buffer — write immediately (crash-safe)
- KHÔNG dùng external logging libraries
- Paths via `config.mjs`

## Dependencies

- `06-mcp_multi-session-hardening` phải xong trước (worker-registry exists)
- `05-mcp_config-mcp-remote` phải xong trước (config.mjs exists)

## Verification

```bash
node -e "
  import { atomicWrite, readJSON } from './src/utils/file-backend.mjs';
  atomicWrite('test.json', JSON.stringify({ok:true}));
  console.log(readJSON('test.json'));
"
```

## Done Criteria

- [x] `file-backend.mjs` exports all CRUD functions
- [x] `atomicWrite` uses write→rename pattern
- [x] `logger.mjs` creates daily MD log files
- [x] Log entries follow structured MD format
- [x] `worker-registry.mjs` persists to file + loads on init
