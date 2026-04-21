# Plan: Local RAG — GitNexus + Obsidian Knowledge Pipeline

> **Created**: 2026-04-20
> **Status**: Approved
> **Depends on**: `agents/antigravity/plan_evolution-and-local-brain.md` Phase 2 (scan_workspace tool)
> **Research**: [2026-04-20_research_rag-tools-comparison.md](file:///d:/workspace/agent-orchestrator/dev-docs/done/2026-04-20_research_rag-tools-comparison.md)
> **Goal**: Xây dựng pipeline RAG local tại workspace, biến server thành scanner/transformer, intelligence sống trong file `.agent/workspace-memory.md`.

### Quyết định cuối cùng (20/04/2026)

| Layer | Tool | Vai trò |
|-------|------|---------|
| **Code structural intelligence** | **GitNexus** (27K⭐, MCP built-in) | Knowledge graph: symbols, deps, clusters, impact analysis |
| **Git history intelligence** | **Custom `git-context.mjs`** (~200 LOC) | Co-change patterns, hot files, recent activity (gap mà GitNexus KHÔNG có) |
| **Human knowledge** | **Obsidian** (optional, via REST API + MCP) | Architecture decisions, patterns, lessons learned |
| **File structure** | **Custom `file-scanner.mjs`** | File map, purpose detection, stats |
| **Output** | **`memory-generator.mjs`** | Combine all → `.agent/workspace-memory.md` |

---

## Tổng quan

### Vấn đề

Agent hiện tại **phải tự discovery** mỗi session:
- Scan files, đọc imports, hiểu architecture → **tốn 30-50% compute**
- Mỗi session mới = quên hết context cũ → **lặp lại discovery**
- Deep search (grep, view_file) nhiều lần → **hit rate limit nhanh hơn**

### Giải pháp

Xây pipeline RAG local:
```
Data Sources (passive, scan 1 lần)
    ↓
Server (dumb transformer, chỉ chạy khi được gọi)
    ↓
.agent/workspace-memory.md (curated knowledge file)
    ↓
Agent reads file → smart ngay, skip discovery
```

### Nguyên tắc kiến trúc

```
1. INTELLIGENCE SỐNG TRONG WORKSPACE
   → .agent/workspace-memory.md là "bộ nhớ" của agent
   → File này đi theo workspace, không phụ thuộc server

2. SERVER LÀ DUMB SCANNER
   → Chỉ scan + transform khi tool scan_workspace được gọi
   → KHÔNG CHẠY khi file đã tồn tại (guard clause)
   → CHỈ CHẠY LẠI khi force_update: true

3. DATA SOURCES LÀ PASSIVE
   → GitNexus: query knowledge graph via MCP, không modify
   → Custom git-context: đọc git history, không modify
   → Obsidian: đọc vault .md files, không modify (optional)
   → File scanner: đọc file tree, không modify
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Data Sources (read-only)                                │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ GitNexus     │ │ Git History  │ │ Obsidian Vault   │ │
│  │ (MCP query)  │ │ (custom)     │ │ (optional)       │ │
│  │ Structural   │ │ Co-change    │ │ Human knowledge  │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘ │
│         │                │                │              │
│  ┌──────▼────────────────▼────────────────▼───────────┐  │
│  │  Processor Layer (src/services/rag/)                │  │
│  │  ┌────────────────┐ ┌────────────────────────────┐  │  │
│  │  │ gitnexus-      │ │ git-context.mjs (CUSTOM)   │  │  │
│  │  │ bridge.mjs     │ │                            │  │  │
│  │  │                │ │ - Co-change patterns       │  │  │
│  │  │ - Query via    │ │ - Hot files (most commits) │  │  │
│  │  │   MCP client   │ │ - Recent activity          │  │  │
│  │  │ - Symbols/deps │ │ - Contributors             │  │  │
│  │  │ - Clusters     │ │ (fills gap GitNexus misses)│  │  │
│  │  │ - Impact       │ │                            │  │  │
│  │  └────────────────┘ └────────────────────────────┘  │  │
│  │  ┌────────────────┐ ┌────────────────────────────┐  │  │
│  │  │ file-scanner   │ │ obsidian-bridge.mjs (opt)  │  │  │
│  │  │ .mjs (CUSTOM)  │ │                            │  │  │
│  │  │                │ │ - Read vault .md           │  │  │
│  │  │ - File tree    │ │ - Extract frontmatter      │  │  │
│  │  │ - Purposes     │ │ - Match by tags/topic      │  │  │
│  │  │ - Sizes        │ │                            │  │  │
│  │  └────────────────┘ └────────────────────────────┘  │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼───────────────────────────┐  │
│  │  Memory Generator (src/services/rag/memory-gen)    │  │
│  │  - Combine all sources                             │  │
│  │  - Template → markdown                             │  │
│  │  - Freshness check                                 │  │
│  │  - Write .agent/workspace-memory.md                │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼───────────────────────────┐  │
│  │  MCP Tool: scan_workspace                          │  │
│  │  - Guard: skip if file exists && !force_update      │  │
│  │  - Orchestrate processors → generator               │  │
│  │  - Return stats                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Output: .agent/workspace-memory.md                      │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Git Context Analyzer (Custom — fills GitNexus gap)

**File**: `src/services/rag/git-context.mjs`

**Input**: Repository path
**Output**:
```javascript
{
  coChangePatterns: [
    { fileA: "tools.mjs", fileB: "state-manager.mjs", count: 15, lastTogether: "2026-04-14" },
    { fileA: "task-queue.mjs", fileB: "poll-helpers.mjs", count: 8, lastTogether: "2026-04-10" }
  ],
  hotFiles: [
    { path: "src/mcp-server/tools.mjs", commits: 42, lastModified: "2026-04-14" }
  ],
  recentActivity: [
    { date: "2026-04-20", files: ["README.md"], message: "Sync master" },
    { date: "2026-04-14", files: ["src/slider/..."], message: "Refactor slider" }
  ],
  contributors: [
    { name: "Quoc Thanh", commits: 85 }
  ]
}
```

**Implementation**:
```javascript
import { execSync } from 'child_process';

export async function analyzeGitContext(repoPath, options = {}) {
  const { maxCommits = 200, minCoChanges = 3, recentDays = 14 } = options;

  // 1. Co-change analysis
  //    git log --name-only --format="COMMIT:%H" -n {maxCommits}
  //    Parse → build co-occurrence matrix → filter by minCoChanges

  // 2. Hot files (most changed)
  //    git log --name-only --format="" -n {maxCommits} | sort | uniq -c | sort -rn

  // 3. Recent activity
  //    git log --since="{recentDays} days ago" --format="%H|%ai|%s" --name-only

  // 4. Contributors
  //    git shortlog -sn --no-merges

  return { coChangePatterns, hotFiles, recentActivity, contributors };
}
```

**Guard**: Nếu không phải git repo (`.git/` không tồn tại) → return empty, không crash.

### 2. GitNexus Bridge (structural intelligence via MCP)

**File**: `src/services/rag/gitnexus-bridge.mjs`

**Prerequisite**: `npx gitnexus analyze` phải chạy 1 lần trước (index repo).

**Input**: Workspace path (có `.gitnexus/` directory)
**Output**:
```javascript
{
  symbols: [
    { name: "registerTools", kind: "function", file: "src/mcp-server/tools.mjs", line: 42 }
  ],
  dependencies: [
    { from: "src/index.mjs", to: "src/config.mjs", type: "import" }
  ],
  clusters: [
    { name: "mcp-server", files: ["tools.mjs", "state-manager.mjs"], cohesion: 0.87 }
  ],
  entryPoints: ["src/index.mjs"],
  impactAnalysis: null // populated on demand
}
```

**Implementation**:
```javascript
import { execSync } from 'child_process';
import fs from 'fs';

export async function queryGitNexus(workspacePath, options = {}) {
  const gitnexusDir = path.join(workspacePath, '.gitnexus');
  
  // Guard: GitNexus chưa indexed
  if (!fs.existsSync(gitnexusDir)) {
    return { symbols: [], dependencies: [], clusters: [], status: 'NOT_INDEXED',
             hint: 'Run: npx gitnexus analyze' };
  }

  // Query via GitNexus MCP tools (hoặc CLI fallback)
  // Option 1: Gọi trực tiếp MCP nếu đang chạy
  // Option 2: execSync('npx gitnexus status') rồi parse output
  // Option 3: Đọc .gitnexus/ files trực tiếp

  return { symbols, dependencies, clusters, entryPoints };
}
```

**Guard**: Nếu `.gitnexus/` không tồn tại → return empty + hint, không crash.

### 3. File Scanner

**File**: `src/services/rag/file-scanner.mjs`

**Input**: Root path
**Output**:
```javascript
{
  fileMap: [
    { path: "src/index.mjs", type: "source", size: 1024, lastModified: "2026-04-14",
      purpose: "Entry point — CLI serve command" },
    { path: "package.json", type: "config", size: 2048, lastModified: "2026-04-20",
      purpose: "Package manifest" }
  ],
  stats: {
    totalFiles: 45,
    totalSize: "120KB",
    languages: { javascript: 30, markdown: 10, json: 5 }
  }
}
```

**Purpose detection**:
- `index.*` → "Entry point"
- `config.*` → "Configuration"
- `*test*`, `*spec*` → "Test"
- `README*` → "Documentation"
- Files in `src/mcp-server/` → "MCP Server module"
- Default → infer from directory name

### 4. Obsidian Bridge (optional)

**File**: `src/services/rag/obsidian-bridge.mjs`

**Input**: Vault path + query context
**Output**:
```javascript
{
  items: [
    {
      title: "MCP Architecture Notes",
      path: "vault/dev/mcp-architecture.md",
      tags: ["mcp", "architecture"],
      excerpt: "First 200 chars...",
      lastModified: "2026-04-15"
    }
  ]
}
```

**Implementation**:
```javascript
export async function queryVault(vaultPath, options = {}) {
  const { tags = [], keywords = [], maxResults = 10 } = options;

  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { items: [], status: 'VAULT_NOT_CONFIGURED' };
  }

  // 1. Find all .md files in vault
  // 2. Parse YAML frontmatter (tags, aliases)
  // 3. Match by tags OR keyword search in content
  // 4. Return top N by relevance (tag match > keyword match)

  return { items };
}
```

**Config**: Vault path configurable trong orchestrator config hoặc env var `OBSIDIAN_VAULT_PATH`.
**Guard**: Nếu vault path không set hoặc không tồn tại → return empty, không crash.

### 5. Memory Generator

**File**: `src/services/rag/memory-generator.mjs`

**Input**: Combined data từ tất cả processors
**Output**: Markdown string (nội dung workspace-memory.md)

**Template**:
```markdown
# Workspace Memory
# Auto-generated by orchestrator. DO NOT edit manually.
# Last updated: {timestamp}
# Freshness: {hours_since_update}h ago
# To update: call scan_workspace tool with force_update: true

## Project Overview
- Name: {packageJson.name}
- Type: {detected_type} (e.g., MCP Server, React App)
- Entry: {entryPoints}
- Dependencies: {top_deps}

## File Map
| Path | Type | Purpose | Size | Modified |
|------|------|---------|------|----------|
{fileMap rows}

## Architecture (Import Graph)
### Entry Points
{entryPoints list}

### Module Clusters  
{clusters with internal dependencies}

### Key Dependencies
{top external dependencies from package.json}

## Git Intelligence
### Files That Change Together (Co-change patterns)
{coChangePatterns table}

### Hot Files (most active)
{hotFiles table}

### Recent Activity ({recentDays} days)
{recentActivity timeline}

## Knowledge Base
{obsidian items or "No vault configured"}

## Known Patterns
{extracted from existing .agent/ skills/workflows}
```

### 6. MCP Tool: scan_workspace

**File sửa**: `src/mcp-server/tools.mjs` (thêm tool)

```javascript
{
  name: "scan_workspace",
  description: "Scan workspace to generate .agent/workspace-memory.md. " +
    "Combines file structure, import graph, git history, and knowledge sources. " +
    "Only runs if memory file doesn't exist or force_update is true.",
  inputSchema: z.object({
    force_update: z.boolean().optional().default(false),
    include_obsidian: z.boolean().optional().default(false),
    obsidian_vault_path: z.string().optional()
  }),
  handler: async ({ force_update, include_obsidian, obsidian_vault_path }) => {
    const memoryPath = path.join(workspacePath, '.agent', 'workspace-memory.md');

    // Guard
    if (fs.existsSync(memoryPath) && !force_update) {
      const stat = fs.statSync(memoryPath);
      const hoursAgo = (Date.now() - stat.mtimeMs) / 3600000;
      return {
        status: 'CACHED',
        path: memoryPath,
        freshness: `${hoursAgo.toFixed(1)}h ago`,
        hint: 'Use force_update:true to re-scan'
      };
    }

    // Run processors
    const [fileData, gitData, graphData, knowledgeData] = await Promise.all([
      scanFiles(workspacePath),
      analyzeGitContext(workspacePath),
      parseImportGraph(workspacePath),
      include_obsidian ? queryVault(obsidian_vault_path) : { items: [] }
    ]);

    // Generate + write
    const markdown = generateMemory({ fileData, gitData, graphData, knowledgeData });
    fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
    fs.writeFileSync(memoryPath, markdown);

    return {
      status: 'GENERATED',
      path: memoryPath,
      stats: { files: fileData.length, edges: graphData.edges.length,
               commits: gitData.recentActivity.length, knowledge: knowledgeData.items.length }
    };
  }
}
```

---

## File Structure

```
src/services/rag/
├── git-context.mjs          ← CUSTOM: Git co-change + hot files + activity
├── gitnexus-bridge.mjs      ← Bridge to GitNexus MCP (symbols, deps, clusters)
├── file-scanner.mjs         ← CUSTOM: File tree + purpose detection
├── obsidian-bridge.mjs      ← OPTIONAL: Obsidian vault reader
├── memory-generator.mjs     ← Template → markdown combiner
└── index.mjs                ← Re-export all, convenience functions
```

---

## Flowchart

```
Agent session start
    │
    ▼
Check .agent/workspace-memory.md exists?
    │
    ├── YES ──► Read file ──► Agent smart, proceed with task
    │           │
    │           └── (Optional) Check freshness
    │                 │
    │                 ├── < 24h ──► OK, use as-is
    │                 └── > 24h ──► Suggest update (but dont force)
    │
    └── NO ──► Call scan_workspace MCP tool
                │
                ▼
         ┌──────────────────────────┐
         │ Parallel scan:            │
         │  ├── file-scanner         │
         │  ├── git-context          │
         │  ├── import-graph         │
         │  └── obsidian (if config) │
         └──────────┬───────────────┘
                    │
                    ▼
         memory-generator combines all
                    │
                    ▼
         Write .agent/workspace-memory.md
                    │
                    ▼
         Agent reads file ──► Smart, proceed with task
```

---

## Performance Budget

| Operation | Target | Max |
|-----------|--------|-----|
| File scan (500 files) | 500ms | 2s |
| Import graph parse | 1s | 5s |
| Git co-change (200 commits) | 2s | 10s |
| Obsidian query | 500ms | 3s |
| Memory generation | 100ms | 500ms |
| **Total scan_workspace** | **~4s** | **20s** |

Guard: Nếu bất kỳ processor nào timeout → skip processor đó, generate memory với data có sẵn.

---

## Testing Plan

```bash
# Unit tests
tests/services/rag/
├── git-context.test.mjs      ← Mock git commands
├── import-graph.test.mjs     ← Parse fixture files
├── file-scanner.test.mjs     ← Scan test directory
├── memory-generator.test.mjs ← Verify markdown output
└── scan-workspace.test.mjs   ← Integration test

# Manual verification
# 1. Run scan_workspace trên agent-orchestrator repo
# 2. Verify workspace-memory.md chính xác
# 3. Start new AG session → agent đọc file → ít tool calls hơn
# 4. So sánh compute usage: before vs after (via Toolkit quota)
```

---

## Future Extensions

| Extension | Mô tả | Priority |
|-----------|-------|:---:|
| **Embedding-based search** | Vector embeddings cho file content → semantic search | Low (Phase 6+) |
| **Auto-refresh on git push** | Watch `.git/refs/heads/` → auto re-scan | Medium |
| **Multi-workspace** | 1 server serve nhiều workspaces, mỗi workspace 1 memory file | Medium |
| **Agent feedback loop** | Agent ghi "what I learned" → append vào memory file | High |
| **Diff-based update** | Chỉ update phần thay đổi thay vì re-generate toàn bộ | Low |
