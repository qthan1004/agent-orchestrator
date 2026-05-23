# Research: CocoIndex — Incremental Engine for Long-Horizon Agents

> Date: 2026-05-08
> Context: Agent-orchestrator Phase 2
> Repos: [cocoindex-io/cocoindex](https://github.com/cocoindex-io/cocoindex) (⭐ 8.9k) · [cocoindex-io/cocoindex-code](https://github.com/cocoindex-io/cocoindex-code) (⭐ 1.6k)

---

## 1. CocoIndex là gì?

CocoIndex gồm **2 sản phẩm** từ cùng một team:

### 1.1 CocoIndex (Core) — Incremental Data ETL for AI

| Thuộc tính | Chi tiết |
|-----------|----------|
| **Stack** | Rust engine + Python API |
| **License** | Apache 2.0 |
| **Version** | v1.0.3 (stable, 197 releases) |
| **Mục đích** | Giữ data cho AI agents luôn "fresh" — chỉ xử lý delta (Δ), không rebuild toàn bộ |

**Core concept — "React for Data Engineering":**
- Bạn **khai báo** target state là function của source data (giống React render)
- Engine tự động detect change, chỉ recompute phần bị ảnh hưởng
- Tự xóa stale records, tự thêm records mới

**Kiến trúc 3 lớp:**
```
Sources (S3, DB, files, APIs)
    ↓
Transformations (chunking, embedding, LLM extraction, graph)
    ↓
Targets (Vector DB, SQL, Knowledge Graph)
```

**Tính năng nổi bật:**
- ✅ **Incremental processing** — chỉ recompute Δ, memoize expensive ops (embedding)
- ✅ **Full lineage** — trace ngược từ output → source, audit được
- ✅ **Stale data removal** — tự xóa records cũ khi source thay đổi
- ✅ **Live/continuous mode** — real-time change capture
- ✅ **Durable execution** — auto-retry, không mất progress
- ✅ **Parallel by default** — Rust engine, zero-copy transforms

### 1.2 CocoIndex-Code — Semantic Code Search CLI

| Thuộc tính | Chi tiết |
|-----------|----------|
| **Stack** | Python (dùng CocoIndex engine bên dưới) |
| **Mục đích** | AST-based semantic search cho codebase, tối ưu cho coding agents |
| **Claim** | Giảm 70% token usage cho coding agents |

**Cách hoạt động:**
```
Codebase → AST parsing → Semantic chunking → Embedding → Vector index
                                                              ↓
Agent query ("find auth logic") → Semantic search → Relevant code chunks
```

**Tích hợp:**
- CLI: `ccc init` → `ccc index` → `ccc search "query"`
- MCP Server: `ccc mcp` (tích hợp Claude, Codex, Cursor)
- Skill file: `npx skills add cocoindex-io/cocoindex-code`
- Docker support với persistent daemon

---

## 2. So sánh vị trí trong AI Stack

```
┌─────────────────────────────────────────────────────┐
│  Agent Orchestrator (our project)                   │  ← "Brain" — orchestration
│  = LangChain/LangGraph layer                        │
├─────────────────────────────────────────────────────┤
│  LlamaIndex / RAG layer                             │  ← "Knowledge retrieval"
├─────────────────────────────────────────────────────┤
│  CocoIndex                                          │  ← "Data pipeline / freshness"
│  Keeps all data sources in sync → feeds upper layers│
└─────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> CocoIndex **không phải agent framework** — nó là **data infrastructure layer** phía dưới.
> Nó giải quyết bài toán: "Làm sao agent luôn có data mới nhất mà không phải rebuild toàn bộ?"

---

## 3. Áp dụng được gì cho Agent-Orchestrator?

### ✅ Áp dụng trực tiếp (HIGH VALUE)

#### 3.1 `cocoindex-code` — Semantic Code Search cho Agent Workers

**Vấn đề hiện tại:** Agent workers trong orchestrator cần hiểu codebase để thực hiện task, nhưng phải đọc toàn bộ file → tốn token, chậm.

**Giải pháp:** Tích hợp `cocoindex-code` làm tool cho agent workers:
- Worker nhận task "fix bug in auth module"
- Thay vì đọc tất cả files, dùng `ccc search "authentication logic"` → chỉ nhận relevant chunks
- **Giảm 70% token** → giảm chi phí LLM, tăng tốc

**Cách tích hợp:**
```bash
# Install
pipx install 'cocoindex-code[full]'

# Trong mỗi project workspace
ccc init && ccc index

# Agent worker gọi qua MCP hoặc CLI subprocess
ccc search "database connection pool" --lang typescript
```

> **Priority: HIGH** — Dễ tích hợp, impact lớn, không cần thay đổi architecture.

#### 3.2 Incremental Workspace Memory

**Vấn đề hiện tại:** `workspace-memory.md` là static file, agent phải đọc toàn bộ mỗi lần. Khi project scale, file này sẽ quá lớn.

**Ý tưởng lấy từ CocoIndex:**
- Áp dụng **declarative state model** cho workspace memory
- Memory = f(source files) — tự động derive từ codebase
- Chỉ recompute khi source files thay đổi (incremental)

**Ví dụ concept:**
```typescript
// Pseudo-code: Declarative workspace memory
const workspaceMemory = deriveFrom({
  sources: ['src/**/*.ts', 'tasks/pending/*.md', 'dev-docs/*.md'],
  transform: (files) => ({
    architecture: extractArchitecture(files),
    pendingTasks: extractTasks(files),
    recentChanges: diffSinceLastRun(files)
  }),
  incremental: true  // chỉ recompute delta
});
```

> **Priority: MEDIUM** — Cần thiết cho Phase 2 scale, nhưng cần custom implementation.

#### 3.3 Case Bank Indexing

**Vấn đề hiện tại:** Case bank (`~/.orchestrator/case-bank/`) sẽ grow over time. Linear search sẽ không scale.

**Ý tưởng lấy từ CocoIndex:**
- Dùng incremental indexing cho case bank
- Khi agent hoàn thành task → thêm case → chỉ index case mới (Δ)
- Semantic search khi cần recall: "tìm case tương tự task hiện tại"

> **Priority: MEDIUM-HIGH** — Trùng khớp với task P2-22 (case-bank-save).

---

### 💡 Lấy cảm hứng (DESIGN PATTERNS)

#### 3.4 Declarative Data Flow Pattern

CocoIndex dùng mô hình **"React for data"** — khai báo target state, engine tự reconcile. Đây là pattern mạnh cho orchestrator:

```
Current state (files, memory, tasks)
    ↓ Declarative transform
Target state (indexed, categorized, ready-for-agent)
    ↓ Auto-reconcile
Only Δ gets processed
```

**Áp dụng:** Thay vì imperative "read file → parse → store", dùng declarative "target state should look like THIS" → engine figures out HOW.

#### 3.5 Full Lineage & Observability

CocoIndex tracks lineage: mỗi output traceable về source. Áp dụng cho orchestrator:
- Mỗi agent decision → traceable về input data + prompt + model
- Debug: "Tại sao agent quyết định X?" → trace ngược lineage
- Compliance-ready (quan trọng cho enterprise)

---

### ❌ Không nên áp dụng trực tiếp

| Thứ | Lý do |
|-----|-------|
| CocoIndex core engine | Python + Rust, project dùng Node.js/TS. Overhead quá lớn để integrate |
| Vector DB dependencies | Phase 2 chưa cần, thêm complexity không cần thiết |
| Full ETL pipeline | Overkill cho current scale, phù hợp hơn khi có nhiều data sources |

---

## 4. Đề xuất hành động

| # | Action | Priority | Effort | Khi nào |
|---|--------|----------|--------|---------|
| 1 | **Install `cocoindex-code`** làm tool cho agent workers | 🔴 HIGH | Low (1-2h) | Ngay khi có task P2-05 (Ollama client) done |
| 2 | **Thiết kế incremental memory pattern** dựa trên CocoIndex mental model | 🟡 MEDIUM | Medium (1-2 days) | Phase 2, song song với WM tasks |
| 3 | **Tích hợp semantic search vào case-bank** (P2-22) | 🟡 MEDIUM | Medium | Khi làm task P2-22 |
| 4 | **Thêm lineage tracking** cho agent decisions | 🟢 LOW | High | Phase 2 later |
| 5 | **Evaluate CocoIndex core** cho data pipeline khi project scale | 🟢 LOW | Research | Phase 3 |

---

## 5. Kết luận

CocoIndex hay ở **2 điểm chính**:

1. **`cocoindex-code`** — Công cụ thực tiễn, cài ngay được, giảm 70% token cho coding agents. Đây là **quick win** lớn nhất.

2. **Incremental/Declarative mental model** — "React for data" là pattern mạnh. Không cần dùng CocoIndex engine, nhưng nên áp dụng **tư duy** này cho workspace memory và case bank của orchestrator.

> [!TIP]
> **Recommendation:** Bắt đầu với `cocoindex-code` (action #1) — cài thử trong project hiện tại, xem hiệu quả token saving thực tế. Từ đó quyết định có đi sâu hơn với các pattern khác không.
