# Research: So sánh công cụ cho Local RAG Pipeline

> **Created**: 2026-04-20
> **Mục đích**: So sánh independent các tool indexing + knowledge base cho workspace memory injection.
> **Liên quan**: [plan_local-rag-gitnaxus-obsidian.md](file:///d:/workspace/agent-orchestrator/dev-docs/plan_local-rag-gitnaxus-obsidian.md)

---

## Bối cảnh

Cần 2 layer cho RAG pipeline:

| Layer | Vai trò | Data source |
|-------|---------|-------------|
| **L1: Code Intelligence** | Index codebase → structural graph (imports, calls, co-change) | Source files + git history |
| **L2: Knowledge Base** | Kiến thức con người (architecture decisions, patterns, lessons learned) | Markdown notes |

Output → combine → `.agent/workspace-memory.md` → agent đọc → smart ngay.

---

## Layer 1: Code Intelligence Tools

### 1.1 GitNexus ⭐ (Bạn đã chọn)

| Attribute | Detail |
|-----------|--------|
| **GitHub** | [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus) — **27K+ stars** |
| **Approach** | Knowledge Graph (Tree-sitter → embedded graph DB) |
| **Parser** | Tree-sitter — 14 languages (TS, Python, Java, Go, Rust, etc.) |
| **Storage** | `.gitnexus/` local, sử dụng LadybugDB (embedded graph + vector) |
| **MCP** | ✅ Built-in MCP server (`npx gitnexus mcp`) |
| **Install** | `npx gitnexus analyze` (index) → `npx gitnexus setup` (auto-config editors) |
| **Privacy** | ✅ 100% local, zero-server |

**Core features**:
```
1. Symbol extraction — functions, classes, methods, interfaces
2. Cross-file resolution — imports, calls, inheritance → graph edges
3. Community detection — Leiden algorithm clusters related symbols
4. Call chain tracing — execution flow from entry points
5. Blast radius / Impact analysis — "nếu sửa file X, ảnh hưởng gì?"
6. Git-diff awareness — map changes → affected processes
7. Graph-enhanced RAG — query graph thay vì scan files
8. 360° symbol view — define, call, reference, import cho mỗi symbol
```

**Khi nào dùng**: Repo vừa-lớn, cần hiểu architecture + dependencies sâu. Ngăn agent "blind edit" (sửa 1 file mà không biết 47 file khác phụ thuộc).

**Điểm mạnh so với alternatives**:
- MCP server sẵn → plug-and-play với AG
- Graph-based → trả về structural context chứ không chỉ text
- Impact analysis = unique feature, không tool nào khác có

**Điểm yếu**:
- Index lần đầu có thể chậm (repo lớn)
- Chỉ structural analysis, KHÔNG có git history co-change
- 27K stars nhưng vẫn young project, có thể có bugs

---

### 1.2 Aider Repo-map

| Attribute | Detail |
|-----------|--------|
| **GitHub** | [Aider-AI/aider](https://github.com/Aider-AI/aider) — rất phổ biến |
| **Approach** | Dynamic Symbol Map (Tree-sitter → PageRank ranking) |
| **Parser** | Tree-sitter |
| **Storage** | SQLite cache (tags + file hashes) |
| **MCP** | ❌ Không có MCP riêng (built into Aider CLI) |
| **Privacy** | ✅ 100% local |

**Core features**:
```
1. Tree-sitter parse → extract symbol "tags" (name, kind, file, line)
2. Build directed graph: files = nodes, dependencies = edges
3. PageRank ranking — weighted bởi chat context (50x boost cho active files)
4. Token budgeting — binary search tìm max tags fit trong budget (default 1K tokens)
5. Elided views — chỉ hiện signatures, không full file
6. Adaptive — re-rank mỗi interaction, map tự update theo conversation
7. Caching — chỉ re-parse files đã thay đổi
```

**Khi nào dùng**: Pair programming thời gian thực, context tự adapt. Rất thông minh về việc chọn ĐÚNG context.

**Điểm mạnh so với alternatives**:
- **Adaptive context** — không static, map thay đổi theo conversation
- **Token efficiency** — chỉ send đúng lượng context cần thiết
- **PageRank** — thuật toán đã proven (Google Search dùng) cho ranking importance

**Điểm yếu**:
- ❌ KHÔNG có MCP server riêng (bundled trong Aider)
- ❌ KHÔNG export ra file (chỉ internal use)
- Python-based (thêm dependency)
- Không có impact/blast radius analysis

**Tái sử dụng**: Có thể **mượn algorithm** (Tree-sitter + PageRank + token budget) để build custom cho orchestrator, nhưng không plug-and-play.

---

### 1.3 Repomix

| Attribute | Detail |
|-----------|--------|
| **GitHub** | [yamadashy/repomix](https://github.com/yamadashy/repomix) |
| **Approach** | Context Packing (flatten repo → single file) |
| **Output** | XML / Markdown / JSON (single file chứa toàn bộ repo) |
| **MCP** | ✅ Có MCP server mode |
| **Privacy** | ✅ 100% local |

**Core features**:
```
1. Flatten toàn bộ repo → 1 file (XML/MD/JSON)
2. Respects .gitignore 
3. Token counting (biết file output bao nhiêu tokens)
4. Security check — detect sensitive data trước khi pack
5. MCP server mode — remote repo packing on demand
```

**Khi nào dùng**: One-shot tasks, repo nhỏ-vừa, cần cho AI "nuốt" toàn bộ repo 1 lần.

**Điểm mạnh**:
- Cực kỳ đơn giản — 1 command xong
- Có MCP server
- Token counting = biết trước bao nhiêu context

**Điểm yếu**:
- ❌ KHÔNG có graph/structural intelligence
- ❌ KHÔNG có ranking — dump tất cả, không smart selection
- Repo lớn → file output CỰC LỚN → exceed context window
- Không adaptive — static dump

**Verdict**: Useful cho repo nhỏ, nhưng **KHÔNG phù hợp** cho workspace memory pipeline. Thiếu intelligence.

---

### 1.4 Sourcegraph

| Attribute | Detail |
|-----------|--------|
| **Approach** | Enterprise Code Search + Intelligence |
| **Deploy** | Cloud / Self-hosted (Docker) |
| **MCP** | ✅ Có MCP server (Deep Search) |
| **Privacy** | ⚠️ Self-hosted = local, Cloud = external |

**Điểm mạnh**: Cross-repo search, go-to-definition, find-references ở enterprise scale.

**Điểm yếu**:
- ❌ OVERKILL cho single-user, single-repo
- ❌ Heavy infrastructure (Docker, PostgreSQL, etc.)
- ❌ Không có graph/co-change intelligence
- ❌ Thiếu privacy guarantees nếu dùng cloud

**Verdict**: **KHÔNG phù hợp** cho orchestrator use case. Overkill.

---

### So sánh Layer 1

| Feature | GitNexus | Aider Repo-map | Repomix | Sourcegraph |
|---------|:--------:|:----------:|:-------:|:-----------:|
| **MCP Server** | ✅ Built-in | ❌ | ✅ | ✅ |
| **Tree-sitter parsing** | ✅ | ✅ | ❌ | ✅ |
| **Knowledge graph** | ✅ | ❌ (flat ranking) | ❌ | ❌ |
| **Impact analysis** | ✅ | ❌ | ❌ | ❌ |
| **Adaptive context** | ❌ | ✅ PageRank | ❌ | ❌ |
| **Token budget** | ❌ | ✅ | ✅ counting | ❌ |
| **Git history analysis** | ⚠️ Partial | ❌ | ❌ | ❌ |
| **Co-change patterns** | ❌ | ❌ | ❌ | ❌ |
| **100% Local** | ✅ | ✅ | ✅ | ⚠️ |
| **Install complexity** | Low (npx) | Medium (pip) | Low (npx) | High (Docker) |
| **Languages** | 14 | 10+ | All (text) | All |
| **Stars** | 27K+ | High | High | Very High |

> [!IMPORTANT]
> **Không tool nào có git history co-change analysis!** Đây là gap mà orchestrator cần tự build (`git-context.mjs` trong RAG plan).

---

## Layer 2: Knowledge Base Tools

### 2.1 Obsidian ⭐ (Bạn đã chọn)

| Attribute | Detail |
|-----------|--------|
| **Type** | Local-first markdown vault |
| **Graph** | ✅ Built-in graph view (wiki-links `[[note]]`) |
| **MCP** | ✅ Via "Local REST API" plugin + community MCP servers |
| **Plugins** | 1000+ community plugins |
| **Privacy** | ✅ 100% local (sync optional) |

**Core features cho dev use case**:
```
1. Markdown files + YAML frontmatter (tags, status, type)
2. Graph view — visualize note relationships
3. [[Wiki-links]] — bidirectional linking
4. Templates — standardized note structure
5. Local REST API plugin → expose vault to external tools
6. MCP servers: obsidian-mcp-pro, mcp-obsidian, etc.
7. Community: huge, mature, battle-tested
```

**MCP Integration path**:
```
Obsidian Vault
  ↓ (Local REST API plugin, localhost:27123)
  ↓
MCP Server (mcp-obsidian)
  ↓
Orchestrator reads relevant notes
  ↓
Inject vào workspace-memory.md
```

**Điểm mạnh**:
- Mature ecosystem (7+ years, millions users)
- Graph view = visualize knowledge relationships
- Huge plugin ecosystem
- Frontmatter + tags = structured queries
- Already widely used bởi devs

**Điểm yếu**:
- Cần install Obsidian app (Electron, ~200MB)
- REST API plugin cần chạy Obsidian trong background
- Vault structure tự do → inconsistent nếu không discipline
- Không AI-native (AI là plugin, không phải core)

---

### 2.2 Logseq

| Attribute | Detail |
|-----------|--------|
| **Type** | Open-source, local-first outliner |
| **Graph** | ✅ Built-in graph (block-level, finer than Obsidian) |
| **MCP** | ✅ Community MCP servers |
| **Privacy** | ✅ 100% local |

**Điểm mạnh so với Obsidian**:
- **Open source** (vs Obsidian = freemium)
- **Block-level linking** — granular hơn Obsidian (link tới paragraph, không chỉ file)
- Journal-first workflow — tốt cho daily dev log

**Điểm yếu so với Obsidian**:
- Plugin ecosystem nhỏ hơn nhiều
- MCP integration ít mature hơn
- Performance issues với vault lớn
- UI outliner-style — không phải ai cũng thích

**Verdict**: Good alternative nếu ưu tiên open-source. Nhưng Obsidian ecosystem mạnh hơn cho dev use case.

---

### 2.3 NoteCore

| Attribute | Detail |
|-----------|--------|
| **Type** | AI-native, local-first knowledge base |
| **Focus** | Code snippets + technical documentation |
| **AI** | Built-in vector embeddings + semantic search |
| **MCP** | ⚠️ Mới, chưa rõ MCP support |

**Điểm mạnh**:
- **AI-native** — semantic search built-in, không cần plugin
- Optimized cho code context
- Local vector embeddings

**Điểm yếu**:
- Rất mới, community nhỏ
- Chưa proven ở scale
- Less mature MCP integration

**Verdict**: Đáng theo dõi cho tương lai, nhưng **chưa đủ mature** để production.

---

### 2.4 Plain Markdown Vault (No App)

| Attribute | Detail |
|-----------|--------|
| **Type** | Folder .md files + git |
| **Graph** | ❌ (phải tự parse [[links]]) |
| **MCP** | ✅ Via `mcp-markdown-vault` hoặc custom |
| **Privacy** | ✅ Hoàn toàn |

**Điểm mạnh**:
- **Zero dependency** — không cần install app
- Git-native — version control tự nhiên
- Orchestrator tự đọc bằng `fs.readFile`
- Headless — không cần Obsidian chạy background

**Điểm yếu**:
- Không có graph view UI
- Không có template engine
- Phải tự build search/query

**Verdict**: **Viable lightweight option** nếu không muốn dependency vào Obsidian app. Orchestrator đọc trực tiếp folder .md files.

---

### So sánh Layer 2

| Feature | Obsidian | Logseq | NoteCore | Plain Vault |
|---------|:--------:|:------:|:--------:|:-----------:|
| **Graph view** | ✅ Rich | ✅ Block-level | ⚠️ | ❌ |
| **MCP ready** | ✅ Mature | ✅ | ⚠️ | ✅ Custom |
| **AI-native** | ❌ Plugin | ❌ Plugin | ✅ Built-in | ❌ |
| **Open source** | ❌ Freemium | ✅ | ✅ | ✅ |
| **Plugin ecosystem** | 🟢 Huge | 🟡 Medium | 🔴 Small | N/A |
| **Zero dependency** | ❌ (Electron) | ❌ (Electron) | ⚠️ | ✅ |
| **Maturity** | 🟢 7+ years | 🟡 4+ years | 🔴 New | ✅ |
| **Dev community** | 🟢 Very large | 🟡 Medium | 🔴 Small | N/A |

---

## Đánh giá combo cho Orchestrator

### Option A: GitNexus + Obsidian (Bạn đề xuất)

```
Ưu điểm:
  ✅ GitNexus: Deep structural intelligence, MCP sẵn, 27K stars
  ✅ Obsidian: Mature ecosystem, graph view, huge community
  ✅ Cả hai đều local-first, privacy OK
  
Nhược điểm:
  ⚠️ 2 tools external → 2 dependencies
  ⚠️ Obsidian cần chạy background (cho REST API)
  ⚠️ Thiếu git co-change → phải tự build bổ sung
  ⚠️ GitNexus output = graph queries → cần transformer layer
```

### Option B: GitNexus + Plain Vault

```
Ưu điểm:
  ✅ GitNexus: Deep structural intelligence
  ✅ Plain vault: Zero dependency, orchestrator đọc trực tiếp
  ✅ Không cần Obsidian chạy background
  
Nhược điểm:
  ⚠️ Không có graph view cho human
  ⚠️ Phải tự build search/query
  ⚠️ Thiếu template engine
```

### Option C: GitNexus + Obsidian + Custom git-context

```
Ưu điểm:
  ✅ FULL COVERAGE: structural (GitNexus) + co-change (custom) + knowledge (Obsidian)
  ✅ Best of all worlds
  
Nhược điểm:
  ⚠️ Complexity cao nhất
  ⚠️ 3 data sources → transformer phải combine
```

### Option D: Custom-only (Aider-inspired)

```
Approach: Tự build tất cả, lấy cảm hứng từ Aider repo-map
  → Tree-sitter parse + PageRank + git-context + plain vault reader

Ưu điểm:
  ✅ Zero external dependency
  ✅ Full control
  ✅ Optimized chính xác cho orchstrator use case
  
Nhược điểm:
  ❌ Build effort LỚN (2-4 tuần cho Tree-sitter integration)
  ❌ Reinvent the wheel (GitNexus đã làm)
  ❌ Maintenance burden
```

---

## Đề xuất

> [!TIP]
> **Recommended: Option A (GitNexus + Obsidian) + custom `git-context.mjs`**
> 
> Lý do:
> 1. GitNexus = plug-and-play MCP, không cần tự build parser
> 2. Obsidian = đã proven, có thể dùng hoặc không (optional layer)
> 3. git-context.mjs = bổ sung co-change analysis, chỉ ~200 lines code
> 4. Tổng effort: thấp nhất trong khi coverage cao nhất

### Pipeline thực tế

```
scan_workspace tool được gọi
    │
    ├── 1. GitNexus MCP query ──────► structural graph (symbols, deps, clusters)
    │      (gọi gitnexus tools)        → "file A imports B, C calls D"
    │
    ├── 2. git-context.mjs (custom) ──► co-change patterns + hot files + activity
    │      (execSync git log)           → "files X,Y always change together"
    │
    ├── 3. Obsidian bridge (optional) ► knowledge items
    │      (REST API query)             → "architecture decision: use Zod for validation"
    │      (hoặc plain vault reader)
    │
    └── 4. file-scanner.mjs (custom) ─► file map + purposes
           (fs.readdir)                 → "src/index.mjs = entry point, 1024 bytes"
    
    ↓ memory-generator.mjs combines all
    ↓
    .agent/workspace-memory.md
```

### Giai đoạn áp dụng

```
Giai đoạn 1 (ngay): 
  → file-scanner + git-context (custom, không dependency)
  → Đã đủ tạo workspace-memory.md cơ bản

Giai đoạn 2 (khi sẵn sàng):
  → Thêm GitNexus (npx gitnexus analyze + MCP)
  → Structural intelligence upgrade

Giai đoạn 3 (optional):
  → Thêm Obsidian bridge (nếu đã dùng Obsidian)
  → Hoặc plain vault reader (nếu không muốn Obsidian app)
```
