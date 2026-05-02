# Task WM03: Git Context Analyzer — Enhanced Co-Change + Hot Files + Activity

## Info
- **ID:** WM03-git-context-analyzer
- **Module:** src/services/rag/git-context.ts
- **Group:** 2 (Workspace Memory Pipeline)
- **Dependencies:** WM01
- **Priority:** 3
- **Ref:** `plan_workspace-memory-pipeline.md` Section 3.2

## What to do

Hiện tại `scan-workspace.ts` chỉ có `analyzeGitCoChanges()` — chỉ trả về co-change pairs.
Plan v2 yêu cầu **3 git signals**:
1. **Co-change patterns** (existing, enhance)
2. **Hot files** (NEW — top 10 most changed files in 30 days)
3. **Recent activity** (NEW — commit timeline 14 days)

### 1. Create git-context module
**[NEW] `src/services/rag/git-context.ts`** (replace WM01 stub)

```typescript
export interface CoChangePattern {
  fileA: string;
  fileB: string;
  count: number;
  lastTogether: string;  // ISO date of most recent commit together
}

export interface HotFile {
  path: string;
  commits: number;     // commit count in last 30 days
  lastModified: string; // ISO date
}

export interface RecentActivity {
  date: string;     // ISO date
  files: string[];  // changed files
  message: string;  // commit message (first line)
}

export interface GitContext {
  coChangePatterns: CoChangePattern[];
  hotFiles: HotFile[];
  recentActivity: RecentActivity[];
}

/**
 * Analyze git history for workspace intelligence.
 * Guards: returns empty GitContext if not a git repo.
 * @param rootDir - Workspace root (must be inside git repo)
 * @param options - { maxCommits, hotFileDays, activityDays }
 */
export function analyzeGitContext(rootDir: string, options?: {
  maxCommits?: number;      // default 200
  hotFileDays?: number;     // default 30
  activityDays?: number;    // default 14
  topCoChanges?: number;    // default 10
  topHotFiles?: number;     // default 10
}): GitContext;
```

### 2. Implementation details

**Co-change patterns** (enhanced from existing):
- Source: `git log --name-only --pretty=format:"---COMMIT---%aI" -200`
- Extract commit dates to populate `lastTogether`
- Filter: commits with ≤ 20 files (avoid merge commits)
- Output: top 10 pairs, sorted by count desc

**Hot files** (new):
- Source: `git log --since="30 days ago" --name-only --pretty=format:""`
- Count occurrences per file
- Output: top 10, sorted by commit count desc
- Include `lastModified` from `git log -1 --pretty=format:"%aI" -- <file>`

**Recent activity** (new):
- Source: `git log --since="14 days ago" --name-only --pretty=format:"---COMMIT---%aI %s"`
- Parse: date, message, file list per commit
- Output: array sorted by date desc, max 20 entries

### 3. Guard clause
- Wrap all `execSync` in try/catch
- If git not available or not a git repo → return `{ coChangePatterns: [], hotFiles: [], recentActivity: [] }`
- Timeout: 10s per git command

### 4. Bỏ `contributors` field
Plan v2 nói rõ: "Bỏ contributors field (không cần cho single-dev)"

## Files
| Action | Path |
|--------|------|
| NEW | `src/services/rag/git-context.ts` |

## Verification
```bash
# 1. Build passes
npm run build

# 2. Manual test: import and call in a script
# node -e "import('./dist/services/rag/git-context.js').then(m => m.analyzeGitContext('.').then(console.log))"

# 3. Verify guard: run in non-git directory → returns empty
```

## Done Criteria
- [ ] `GitContext` interface with 3 fields: coChangePatterns, hotFiles, recentActivity
- [ ] `analyzeGitContext()` returns all 3 signals
- [ ] `lastTogether` populated in co-change patterns
- [ ] Hot files from last 30 days with commit count
- [ ] Recent activity from last 14 days with messages
- [ ] Guard clause: non-git repo returns empty data gracefully
- [ ] No `contributors` field
- [ ] All git commands have 10s timeout
- [ ] `npm run build` passes
