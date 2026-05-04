# Priority Analysis: 3-Tier Refactor vs Phase 2 Timeline

## Bối cảnh

Hiện tại có 3 nhóm công việc cạnh tranh:
1. **Phase 2** (Hybrid Architecture + Local Worker) — mục tiêu chính, delay quá lâu
2. **3-Tier refactor** (tách exchange ra khỏi source) — vừa research xong
3. **8 tasks WM01-WM08** — cải thiện Phase 1 (workspace memory pipeline)

Câu hỏi: cái nào trước?

---

## Phân tích: 3 lựa chọn

### ❌ Lựa chọn A: Refactor 3-tier TRƯỚC Phase 2

```
Timeline: 3-tier refactor (1-2 tuần) → Phase 2 (3-4 tuần)
```

| Pro | Con |
|-----|-----|
| Phase 2 code đã sạch từ đầu | **Delay Phase 2 thêm 1-2 tuần** |
| Không cần refactor lại | Refactor code Phase 1 mà Phase 2 sẽ thay đổi lại → lãng phí |

**Vấn đề lớn nhất**: Phase 2 thay đổi TOÀN BỘ flow — Worker không đọc file, Server spawn subprocess, Agent Runner là component MỚI hoàn toàn. Nếu refactor config.ts, state-manager.ts, tools.ts bây giờ → Phase 2 sẽ VIẾT LẠI chúng. **Refactor 2 lần = phí effort.**

---

### ❌ Lựa chọn B: Phase 2 TRƯỚC, refactor SAU

```
Timeline: Phase 2 (3-4 tuần) → 3-tier refactor (1-2 tuần)
```

| Pro | Con |
|-----|-----|
| Phase 2 đi thẳng | Phase 2 code sẽ hardcode path kiểu cũ → nợ kỹ thuật |
| Nhanh nhất để thấy kết quả | Refactor sau = phải sửa cả code Phase 1 LẪN Phase 2 |
| | Multi-workspace sẽ bị bolt-on thay vì built-in |

**Vấn đề**: Bạn đã nói rõ "phải đáp ứng multi-workspace từ đầu, không work lại từ đầu". Nếu Phase 2 code không có 3-tier → chính bạn sẽ phải refactor lại Phase 2.

---

### ✅ Lựa chọn C: 3-tier refactor NẰM TRONG Phase 2 (Sprint 0)

```
Timeline: Phase 2 Sprint 0 (infrastructure) → Phase 2 Sprint 1-N (features)
```

| Pro | Con |
|-----|-----|
| **Refactor 1 lần duy nhất** | Sprint 0 mất ~3-5 ngày trước khi code feature |
| Phase 2 code sinh ra ĐÃ đúng kiến trúc | |
| Multi-workspace built-in từ đầu | |
| Không delay Phase 2 — refactor LÀ Phase 2 | |

**Đây là lựa chọn tốt nhất.** Lý do:

---

## Tại sao 3-tier refactor = Phase 2 infrastructure?

Nhìn vào Phase 2 design, HẦU HẾT các thay đổi Phase 2 đều TƯƠNG THÍCH với 3-tier:

| Phase 2 Module | Cần path gì? | 3-Tier giải quyết? |
|----------------|-------------|---------------------|
| **TaskDispatchLoop** | Đọc queue, spawn worker | Đọc từ `~/.orchestrator/workspaces/<ws>/queue.json` — 3-tier cung cấp |
| **WorkerProcessManager** | Inject workspace_root vào stdin | Workspace path đã là concept riêng — 3-tier tách sẵn |
| **AgentRunner** (subprocess) | Nhận workspace_root, KHÔNG đọc exchange | Hoàn toàn phù hợp — worker không biết exchange ở đâu |
| **ModelSelector** | Không cần path | Path-agnostic ✅ |
| **OllamaClient** | Không cần path | Path-agnostic ✅ |
| **PlanWatcher** | Quét workspace/.agent/plans/pending/ | 3-tier đã design đúng nơi plan nằm |
| **Server profiles** | Config cho DEFAULT vs HYBRID mode | Nằm trong runtime config, không conflict |

**Phase 2 Principle 1**: "Worker NEVER accesses queue data" → Đây chính là 3-tier! Worker (Tier 3 - workspace) không bao giờ chạm exchange (Tier 2 - runtime).

**Phase 2 Principle 2**: "Worker NEVER loops. Server loops." → Server owns pipeline lifecycle → Tier 2 design.

> Nói cách khác: **Phase 2 architecture ĐÃ NGẦM YÊU CẦU 3-tier separation.** Refactor không phải việc thêm — nó là prerequisite.

---

## Đề xuất timeline

```
Phase 2 — Sprint 0: Infrastructure (3-5 ngày)
├── Tách AppConfig → GlobalConfig + WorkspaceConfig
├── Runtime dir: ~/.orchestrator/ bootstrap
├── Workspace registration flow (register_worker → tạo ws dir)
├── StateManager path refactor (resolve từ workspace config)
├── PlanWatcher multi-workspace (quét registered workspaces)
└── Existing tests vẫn pass (backward compat)

Phase 2 — Sprint 1: Core Engine (1-2 tuần)
├── TaskDispatchLoop (main server loop)
├── WorkerProcessManager (spawn/kill subprocess)
├── OllamaClient (API wrapper)
├── ModelSelector (Quality/Throughput)
└── AgentRunner skeleton (stdin → tools → notify → exit)

Phase 2 — Sprint 2: Agent Runner + Integration (1-2 tuần)
├── AgentRunner full implementation
├── ToolExecutor (path-sandboxed workspace I/O)
├── TokenCounter (checkpoint at 80%)
├── Server profiles (DEFAULT vs HYBRID)
└── E2E tests
```

---

## Còn 8 tasks WM01-WM08 thì sao?

Hiện có 8 task pending cải tiến workspace memory:

| Task | Mô tả | Quyết định |
|------|-------|-----------|
| WM01 — RAG service scaffold | Tạo services/rag/ structure | **DEFER** → Phase 4 (Local RAG), không block Phase 2 |
| WM02 — File scanner refactor | Refactor scan logic | **MERGE** vào Sprint 0 — khi refactor path, scanner cũng cần update |
| WM03 — Git context analyzer | Git co-change analysis | **DEFER** → Phase 4 |
| WM04 — Memory generator | Generate workspace-memory.md | **KEEP** — nhưng thấp hơn Sprint 0-2 |
| WM05 — scan_workspace v2 | Enhanced scan tool | **MERGE** vào Sprint 0 — scan cần biết workspace path mới |
| WM06 — update_memory tool | Tool update memory | **DEFER** |
| WM07 — Prompt memory lifecycle | Memory injection vào prompt | **KEEP** — hữu ích cho AgentRunner prompt building |
| WM08 — E2E verification | Test workspace memory | **KEEP** — merge vào Sprint 2 E2E |

**Tóm lại**: 2 task merge vào Sprint 0 (WM02, WM05), 2 task keep cho Sprint 2 (WM07, WM08), 4 task defer sang Phase 4.

---

## Kết luận

> [!IMPORTANT]
> **3-tier refactor KHÔNG NÊN là một task riêng biệt.** Nó nên là **Sprint 0 của Phase 2** — infrastructure setup trước khi code feature. Điều này:
> - Không delay Phase 2 (refactor LÀ Phase 2)
> - Refactor 1 lần duy nhất (không phí effort)
> - Multi-workspace built-in từ đầu (đúng yêu cầu)
> - Phase 2 code sinh ra đã đúng kiến trúc

Bạn nghĩ sao?
