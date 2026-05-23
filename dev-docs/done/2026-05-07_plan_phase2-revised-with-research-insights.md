# Phase 2 Revised Plan — Post-Research Integration

> **Date**: 2026-05-07
> **Type**: Revised implementation plan
> **Status**: DRAFT — awaiting approval
> **Input**: 3 research docs + review decisions
> **Ref**: `dev-docs/plan_phase2-hybrid-architecture.md` (original Phase 2 plan)
> **Runtime lease addendum**: IMEDIALY-00 through IMEDIALY-09 completed the immediate runtime lease boundary refactor and docs alignment. Older P2 ordering stays paused while IMEDIALY-10..21 handles worker/harness runtime-service correction.

---

## Quyết định đã chốt

| # | Quyết định | Chi tiết |
|---|-----------|----------|
| 1 | **Ngôn ngữ Phase 2** | Node.js/TypeScript — giữ nguyên |
| 2 | **Go migration** | Phase 3+ — viết Agent Runner bằng Go khi Phase 2 stable |
| 3 | **Thiết kế** | Language-agnostic — Agent Runner giao tiếp qua stdin/stdout + HTTP, bất kỳ ngôn ngữ nào cũng thay thế được |
| 4 | **Skills storage** | `reference/skills/` (product folder) — KHÔNG phải `.agent/skills/` |
| 5 | **Reflections format** | Markdown (thân thiện, dễ đọc) |
| 6 | **Case Bank scope** | Global (cross-project) — hướng tới agent wiki |
| 7 | **Infra capacity** | Hardware/runtime capacity do infra verifier cung cấp; không hardcode VRAM/GPU |
| 8 | **Runtime harness adapters** | Cần adapter cho local (Ollama) và CLI runtime (Codex CLI, AG CLI) |
| 9 | **Runtime lease isolation** | 1 active task = 1 runtime lease = 1 backend runtime/session = 1 point reservation |

---

## Thay đổi so với plan gốc

### 0. Runtime Lease Isolation — SỬA MINDSET

Worker không còn được hiểu là "một request tới backend chung". Worker trong Phase 2 phải được hiểu là runtime lease có identity riêng.

```
1 active task -> 1 runtime lease -> 1 backend runtime/session -> 1 point reservation
```

Hệ quả:

- Shared Ollama chỉ là dev-only fallback, tối đa 1 worker.
- Local parallel workers cần nhiều Ollama runtime/endpoint riêng.
- Codex CLI và AG CLI cần adapter riêng, mỗi lease là một process/session riêng.
- Callback phải kèm `task_id`, `worker_id`, `runtime_id`, `lease_generation`.
- Recovery chỉ reclaim khi heartbeat expired, runtime process/session dead, và task vẫn giữ đúng `runtime_id + lease_generation`.
- Stale threshold là một nguồn truth trong runtime heartbeat store, health check phải chạy trước expiry.
- Terminal/log visibility phải báo spawn, backend start, model/tool progress, callback send/accept, health check, retry, reclaim.
- Local scheduling dùng verified capacity profile từ infra verifier, không dùng fixed VRAM assumption hay fixed worker count.
- Resource monitor hiển thị bằng terminal table; UI để sau.
- Worker-service handover là bản ghi chuyển tiếp theo `task_id + runtime_id + lease_generation`, không phải shared memory toàn cục.

**Impact lên tasks**: Runtime lease boundary refactor is complete through IMEDIALY-09. Before expanding Codex/AG behavior further, continue with `IMEDIALY-10..21` worker/harness runtime-service correction.

### 1. Agent Runner Harness — Cloud + Local (MỚI)

Plan gốc chỉ design cho Ollama (local). Research insights + quyết định mới yêu cầu harness **bọc được cả cloud lẫn local**.

```
                   ┌──────────────────────────────────────┐
                   │         AGENT RUNNER HARNESS          │
                   │                                       │
                   │  ┌──────────────────────────────┐    │
                   │  │       LLM Adapter Interface   │    │
                   │  │  chat(messages, tools) → response  │
                   │  └──────────┬───────────────────┘    │
                   │             │                         │
                   │  ┌──────────▼───────────────────┐    │
                   │  │  LocalAdapter (Ollama)        │    │
                   │  │  - POST /api/chat             │    │
                   │  │  - keep_alive: 0              │    │
                   │  │  - token tracking via response │    │
                   │  └──────────────────────────────┘    │
                   │                                       │
                   │  ┌──────────────────────────────┐    │
                   │  │  CloudAdapter (future)        │    │
                   │  │  - Gemini API                  │    │
                   │  │  - OpenAI API                  │    │
                   │  │  - Anthropic API               │    │
                   │  └──────────────────────────────┘    │
                   │                                       │
                   │  ReAct Loop:                          │
                   │  Observe → Reason → Act → Reflect     │
                   │                                       │
                   │  Budget Control:                      │
                   │  Token limits, iteration caps, timeout│
                   │                                       │
                   └──────────────────────────────────────┘
```

**Impact lên tasks**: P2-05 (OllamaClient) mở rộng thành `LLMAdapter` interface. P2-11 (AgentRunner) dùng adapter thay vì gọi Ollama trực tiếp.

### 2. Skills ở `reference/` — KHÔNG phải `.agent/` (SỬA)

Theo folder convention đã có:
- `reference/skills/` = product skills, ship cho workers dùng
- `.agent/skills/` = dev skills, chỉ phục vụ dev agents

**Hiện tại `reference/skills/` đã có**:
- `orchestrator-protocol/`
- `planner-protocol/`
- `strict-scope/`
- `task-quality/`

Worker prompt system (P2-12) phải load skills từ `reference/skills/`, không phải `.agent/skills/`.

**Impact lên tasks**: P2-12 (Worker Prompt System) sửa path source.

### 3. Reflexion-style Self-Reflection — Save as Markdown (MỚI)

Từ Thoth/SEAL research: Workers tự-reflect sau mỗi task, lưu reflection ở global location.

```markdown
# Reflection: P2-11-agent-runner-skeleton
<!-- Date: 2026-05-10 -->
<!-- Outcome: SUCCESS -->
<!-- Domain: node-backend -->
<!-- Task Type: implement -->

## What Worked
- Ollama tool_call parsing worked first try with Qwen 3.5 9B
- Path sandbox caught 2 incorrect paths

## What Failed
- Initial prompt too long → truncated by Ollama → had to reduce

## Lesson
- Keep initial system prompt under 2000 tokens for 9B models
- Always include an explicit "respond with NO tool_calls when done" instruction
```

**Storage**: `~/.orchestrator/case-bank/` (global, cross-project)
- 1 file per reflection: `{date}_{task-id}.md`
- Planner reads relevant reflections khi planning similar tasks

**Impact lên tasks**: P2-13 (Reflexion) mở rộng scope — không chỉ error recovery mà còn **post-task reflection save**.

### 4. Case Bank — Global, Cross-project (MỚI)

Từ Planner Intelligence research, adapted cho scope global.

```
~/.orchestrator/
├── config.json               # Global config
├── workspaces/                # Per-workspace state (existing plan)
│   ├── ws-abc123/
│   └── ws-def456/
│
├── case-bank/                 # 🆕 GLOBAL Case Bank
│   ├── _index.md              # Index of all cases
│   ├── 2026-05-10_P2-11.md    # Reflection per task
│   ├── 2026-05-10_P2-12.md
│   └── ...
│
└── domain-profiles/           # 🆕 GLOBAL Domain Profiles (Phase 3)
    ├── node-backend/
    │   └── profile.md
    └── react-web/
        └── profile.md
```

**Phase 2 scope**: Chỉ save reflections vào case-bank. Chưa có retrieval/matching — Phase 3.
**Phase 3 scope**: Keyword search → TOP-K similar cases → inject vào planner prompt.
**Vision**: Phát triển thành agent wiki — knowledge base global mà mọi project đều benefit.

**Impact lên tasks**: P2-01 (Runtime Directory Bootstrap) thêm `case-bank/` directory.

### 5. Language-Agnostic Agent Runner Interface (NHẤN MẠNH)

Agent Runner giao tiếp hoàn toàn qua:
- **stdin**: Nhận task payload JSON
- **stdout**: Log/debug output
- **HTTP**: Notify server (complete_task, checkpoint)
- **Exit codes**: 0 = success, 1 = failure

→ Bất kỳ ngôn ngữ nào (Node, Go, Rust, Python) đều có thể implement Agent Runner.
→ Phase 3: Viết Agent Runner v2 bằng Go mà server Node.js spawn subprocess Go binary.

```
Server (Node.js) ──stdin──► Agent Runner (Node.js | Go | Rust)
                  ◄─HTTP───
```

**Impact lên tasks**: P2-11 (AgentRunner) explicit document interface contract.

---

## Task Updates

### Tasks cần SỬA

| Task | Thay đổi |
|------|----------|
| **P2-01** Runtime Directory Bootstrap | Thêm `case-bank/` vào `~/.orchestrator/` structure |
| **P2-05** Ollama Client | Rename → `LLM Adapter Interface` + OllamaAdapter. Design interface cho cloud adapters future |
| **P2-11** Agent Runner Skeleton | Dùng LLMAdapter interface thay vì Ollama trực tiếp. Document stdin/stdout/HTTP contract rõ ràng cho language-agnostic |
| **P2-12** Worker Prompt System | Load skills từ `reference/skills/` thay vì `.agent/skills/`. Load reflections từ case-bank (nếu có) |
| **P2-13** Agent Runner Reflexion | Mở rộng: post-task reflection → save markdown vào `~/.orchestrator/case-bank/` |

### Tasks MỚI cần thêm

| Task ID | Tên | Sprint | Dependencies | Mô tả |
|---------|-----|--------|-------------|--------|
| **P2-05b** | Cloud LLM Adapter (Gemini) | Sprint 2 | P2-05 | Implement GeminiAdapter cho LLMAdapter interface |
| **P2-22** | Case Bank Save | Sprint 4 | P2-13 | Post-task reflection → save .md vào global case-bank |
| **P2-23** | Domain Auto-Detect | Sprint 4 | P2-01 | Scan workspace manifest (package.json/go.mod/Cargo.toml) → detect domain tag |

### Tasks DEFER (không trong Phase 2)

| Item | Lý do | Phase |
|------|-------|-------|
| Case Bank retrieval (vector search) | Cần embedding infra | Phase 3 |
| Full Domain Profile system | Overengineered cho current scale | Phase 3 |
| Knowledge Graph (JSON/SQLite) | Flat files đang đủ | Phase 3 |
| Dream Cycle (LLM-powered) | VRAM competition | Phase 3+ |
| Skill auto-creation by workers | Cần human review mechanism | Phase 3 |
| Agent Runner Go rewrite | Ship Node.js first | Phase 3 |
| A2A protocol support | Standard chưa mature | Phase 4+ |
| SEAL-style weight adaptation | Cần significant infra | Phase 5+ |

---

## Updated Sprint Plan

```
Sprint 0: 3-Tier Infrastructure (giữ nguyên)
├── P2-00 Config Model Refactor
├── P2-01 Runtime Directory Bootstrap ← thêm case-bank/
├── P2-02 Workspace Registration
├── P2-03 StateManager Path Migration
└── P2-04 PlanWatcher Multi-workspace

Sprint 1: LLM Adapter + Process Management (SỬA)
├── P2-05 LLM Adapter Interface + OllamaAdapter ← renamed from "Ollama Client"
├── P2-06 Worker Process Manager
├── P2-07 Model Selector
└── P2-08 Server Profiles

Sprint 2: Agent Runner Core (SỬA)
├── P2-09 Tool Executor
├── P2-10 Token Counter
├── P2-11 Agent Runner Skeleton ← uses LLMAdapter, documents contract
├── P2-12 Worker Prompt System ← loads from reference/skills/
├── P2-13 Agent Runner Reflexion ← includes post-task reflection
└── P2-05b Cloud LLM Adapter (Gemini) ← NEW

Sprint 3: Server Dispatch Integration (giữ nguyên)
├── P2-14 Task Dispatch Loop
├── P2-15 VRAM Manager
├── P2-16 Server Hybrid Integration
└── P2-17 Git Worktree

Sprint 4: Polish + E2E + Intelligence (MỞ RỘNG)
├── P2-18 Unified Checkpoint
├── P2-19 Mandatory Changelog
├── P2-20 E2E Integration
├── P2-21 README + Docs Update
├── P2-22 Case Bank Save ← NEW
└── P2-23 Domain Auto-Detect ← NEW
```

---

## Phase 3 Preview (Sau Phase 2 stable)

Từ research insights, Phase 3 sẽ focus vào **Agent Intelligence Layer**:

```
Phase 3: Agent Intelligence (sau Phase 2)
├── Agent Runner v2 bằng Go (learning + production)
├── Case Bank retrieval (keyword → TOP-K matching)
├── Domain Profile system (conventions, anti-patterns)
├── Planner pre-flight (load case bank + domain profile)
├── Skill auto-creation (worker → propose skill → human review)
└── Dream Cycle v1 (file-based rules, no LLM)
```

---

## Verification Criteria

Phase 2 hoàn thành khi:
1. ✅ Server spawn 2-3 worker subprocess song song
2. ✅ Workers giao tiếp qua stdin/HTTP (language-agnostic interface)
3. ✅ OllamaAdapter hoạt động với local models
4. ✅ GeminiAdapter hoạt động với Gemini API
5. ✅ Workers load skills từ `reference/skills/`
6. ✅ Post-task reflections saved vào `~/.orchestrator/case-bank/`
7. ✅ E2E: Plan → decompose → dispatch → execute → reflect → complete
8. ✅ `npm run build` pass, no TypeScript errors
