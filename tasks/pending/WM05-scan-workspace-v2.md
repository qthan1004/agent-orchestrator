# Task WM05: Scan Workspace v2 — Integrate RAG Pipeline

## Info
- **ID:** WM05-scan-workspace-v2
- **Module:** src/mcp-server/tools/scan-workspace.ts
- **Group:** 3 (Workspace Memory Pipeline)
- **Dependencies:** WM02, WM03, WM04
- **Priority:** 5
- **Ref:** `plan_workspace-memory-pipeline.md` Section 3.4

## What to do

Rewrite `scan-workspace.ts` to use RAG pipeline modules thay vì inline code.
Đây là integration task — glue WM02 + WM03 + WM04 lại.

### 1. Rewrite executeScanWorkspace
**[MODIFY] `src/mcp-server/tools/scan-workspace.ts`**

**Before (v1):** Inline `scanDirectory()`, `parseDependencies()`, `analyzeGitCoChanges()`, `generateMarkdown()` — tất cả trong 1 file 400+ lines.

**After (v2):** Thin wrapper gọi RAG services:

```typescript
import { scanFiles } from '../../services/rag/file-scanner.js';
import { analyzeGitContext } from '../../services/rag/git-context.js';
import { generateMemory, extractLearningsSection } from '../../services/rag/memory-generator.js';

export function executeScanWorkspace(rootDir: string, forceUpdate: boolean): ScanResult {
  const memoryPath = path.join(rootDir, '.agent', 'workspace-memory.md');

  // Guard
  if (fs.existsSync(memoryPath) && !forceUpdate) {
    const hoursAgo = (Date.now() - fs.statSync(memoryPath).mtimeMs) / 3600000;
    return { status: 'cached', outputPath: memoryPath, 
             freshness: `${hoursAgo.toFixed(1)}h ago`,
             stats: { filesScanned: 0, depsFound: 0, coChangePairs: 0, truncated: false } };
  }

  // Preserve existing learnings
  const existingLearnings = extractLearningsSection(memoryPath);

  // Scan (2 sources — simple)
  const fileData = scanFiles(rootDir);
  const gitData = analyzeGitContext(rootDir);

  // Generate + write (preserve learnings)
  const markdown = generateMemory({ rootDir, fileData, gitData, learnings: existingLearnings });
  
  fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
  fs.writeFileSync(memoryPath, markdown, 'utf-8');

  return {
    status: 'generated',
    outputPath: memoryPath,
    stats: {
      filesScanned: fileData.files.length,
      coChangePairs: gitData.coChangePatterns.length,
      hotFiles: gitData.hotFiles.length,
      truncated: fileData.truncated,
    },
  };
}
```

### 2. Changes vs v1
- **Remove:** `scanDirectory()`, `inferFileType()`, `inferPurpose()`, `formatSize()`, `parseDependencies()`, `analyzeGitCoChanges()`, `readPackageJson()`, `generateMarkdown()` — all moved to RAG services
- **Add:** `freshness` field in cached response
- **Add:** `extractLearningsSection()` call before re-scan
- **Add:** `hotFiles` count in stats
- **Remove:** `depsFound` from stats (dependency graph now part of memory-generator)
- **Keep:** `ScanResult` interface (updated)

### 3. Update ScanResult interface
```typescript
interface ScanResult {
  status: 'generated' | 'cached';
  outputPath: string;
  freshness?: string;       // NEW: how old is cached file
  stats: {
    filesScanned: number;
    coChangePairs: number;
    hotFiles: number;        // NEW
    truncated: boolean;
  };
}
```

### 4. Clean up — File should be < 60 lines
After refactoring, `scan-workspace.ts` should be a thin orchestrator file.
All business logic lives in `src/services/rag/`.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/tools/scan-workspace.ts` |
| MODIFY | `src/mcp-server/tools.ts` (update scan_workspace tool response if needed) |

## Verification
```bash
# 1. Build passes
npm run build

# 2. Start server → call scan_workspace
npm run dev
# → call scan_workspace with force_update: true
# → Verify new format: has Hot Files, Architecture Relationships, Agent Learnings section

# 3. Test caching
# → call scan_workspace without force_update → should return CACHED + freshness

# 4. Test learnings preservation
# → Manually add learning to workspace-memory.md
# → call scan_workspace with force_update: true
# → Verify learning preserved in output

# 5. Existing test passes
node --import tsx tests/test-scan-workspace.mjs
```

## Done Criteria
- [ ] `scan-workspace.ts` < 60 lines (thin wrapper)
- [ ] Imports from `services/rag/` (file-scanner, git-context, memory-generator)
- [ ] Cached response includes `freshness` field
- [ ] Learnings preserved when force_update re-scans
- [ ] Output matches plan v2 template (3-tier)
- [ ] Stats includes `hotFiles` count
- [ ] `npm run build` passes
- [ ] test-scan-workspace.mjs passes (may need update for new format)
