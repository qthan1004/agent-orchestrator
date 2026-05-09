---
name: Coding Standards
description: Project-specific code quality rules. Apply when writing or reviewing TypeScript code.
---

# Coding Standards

Code quality rules specific to this project. Always apply when writing new code or modifying existing files.

---

## 1. Cross-Platform Compatibility

This project runs on **Windows** (primary dev) and **Linux** (potential deployment).

| ❌ Don't | ✅ Do |
|----------|------|
| `exec('kill -9 <pid>')` | `process.kill(pid, 'SIGKILL')` or platform-check |
| `exec('rm -rf <dir>')` | `fs.rmSync(dir, { recursive: true })` |
| Hardcoded `/` path separators | `path.join()` or `path.resolve()` |
| `exec('which <bin>')` | `exec(process.platform === 'win32' ? 'where' : 'which')` |
| Unix-only env vars (`$HOME`) | `os.homedir()` or `process.env.USERPROFILE \|\| process.env.HOME` |

**Rule:** When using `child_process.exec()` with shell commands, always check `process.platform` or use Node.js built-in APIs instead.

---

## 2. Shared Types — No Duplicate Interfaces

When multiple files use the same data shape (e.g., a payload passed between modules):

- **Define once** in a shared location: `src/models/` or a local `types.ts` file.
- **Import everywhere** — never re-declare the same interface in two files.
- **Loose `[key: string]: any`** is a code smell — make it explicit.

**Check before creating a new interface:**
```
"Does this shape already exist in src/models/ or in the module I'm importing from?"
```

If yes → import it. If close but different → extend it.

---

## 3. No Magic Numbers

Hardcoded numeric values without context make code fragile and misleading.

| ❌ Don't | ✅ Do |
|----------|------|
| `new TokenCounter(8192)` | `new TokenCounter(config.contextLimit \|\| DEFAULT_CONTEXT_LIMIT)` |
| `setTimeout(() => {}, 3000)` | `setTimeout(() => {}, KILL_TIMEOUT_MS)` |
| `loopCount < 50` | `loopCount < MAX_TOOL_CALLS` |

**Rule:** Extract numeric literals into:
1. Named constants (`const MAX_TOOL_CALLS = 50;`) at module top, or
2. Config values when they may vary across environments.

**Exception:** `0`, `1`, `-1`, common array indices, HTTP status codes (200, 404, 500) are fine inline.

---

## 4. Error Handling Hygiene

- Always include context in error messages: what failed + why + the input that caused it.
- Never swallow errors silently (`catch (err) {}`) — at minimum log to `console.error`.
- Use typed error patterns: `catch (err: any)` → access `err.message`, not bare `err`.

---

## 5. Timeout on External Calls

All calls to external processes or network must have a timeout:

| Call type | Required |
|-----------|----------|
| `fetch()` | `AbortController` with timeout |
| `child_process.exec()` | `{ timeout: ms }` option |
| LLM API calls | Adapter-level timeout |

**Rule:** No unbounded `await` on external resources. Default timeout: 30s for network, 60s for subprocess.
