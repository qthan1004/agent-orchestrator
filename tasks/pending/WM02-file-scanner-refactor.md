# Task WM02: File Scanner Refactor — Extract to RAG Service

## Info
- **ID:** WM02-file-scanner-refactor
- **Module:** src/services/rag/file-scanner.ts
- **Group:** 2 (Workspace Memory Pipeline)
- **Dependencies:** WM01
- **Priority:** 2
- **Ref:** `plan_workspace-memory-pipeline.md` Section 3.1

## What to do

Hiện tại logic scan files nằm inline trong `src/mcp-server/tools/scan-workspace.ts`.
Cần **extract** ra `src/services/rag/file-scanner.ts` thành reusable module.

### 1. Extract functions
**[NEW] `src/services/rag/file-scanner.ts`** (replace WM01 stub)

Di chuyển các functions sau từ `scan-workspace.ts`:
- `scanDirectory()` — recursive FS scan
- `inferFileType()` — file type detection
- `inferPurpose()` — purpose inference
- `formatSize()` — size formatting
- Constants: `MAX_FILES`, `IGNORE_DIRS`, `IGNORE_FILE_PATTERNS`, `IGNORE_PATH_PREFIXES`
- Interfaces: `FileEntry`

Export signature:
```typescript
export interface FileEntry {
  path: string;
  type: string;
  size: string;
  purpose: string;
}

export interface ScanFilesResult {
  files: FileEntry[];
  truncated: boolean;
}

/**
 * Scan workspace file tree with ignore patterns.
 * @param rootDir - Workspace root path
 * @returns File entries + truncation flag
 */
export function scanFiles(rootDir: string): ScanFilesResult;
```

### 2. Update scan-workspace.ts
**[MODIFY] `src/mcp-server/tools/scan-workspace.ts`**

- Import `scanFiles` from `../../services/rag/file-scanner.js`
- Remove inline scan logic (functions + constants)
- Keep: `parseDependencies()`, `analyzeGitCoChanges()`, `readPackageJson()`, `generateMarkdown()`, `executeScanWorkspace()`

### 3. Ensure backward compatibility
`executeScanWorkspace()` must produce **identical output** — same file map format, same ordering.

## Files
| Action | Path |
|--------|------|
| NEW | `src/services/rag/file-scanner.ts` |
| MODIFY | `src/mcp-server/tools/scan-workspace.ts` |

## Verification
```bash
# 1. Build passes
npm run build

# 2. Existing test passes (output identical)
node --import tsx tests/test-scan-workspace.mjs

# 3. Manual: start server → call scan_workspace → verify .agent/workspace-memory.md generated correctly
```

## Done Criteria
- [ ] `file-scanner.ts` exports `scanFiles()` with proper TypeScript types
- [ ] `scan-workspace.ts` imports from `file-scanner.ts` (no inline scan code)
- [ ] Output format unchanged (backward compatible)
- [ ] `npm run build` passes
- [ ] All constants/ignore patterns preserved
