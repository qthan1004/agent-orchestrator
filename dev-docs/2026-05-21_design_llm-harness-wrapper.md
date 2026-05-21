# Design: LLM Harness Wrapper

> **Date**: 2026-05-21
> **Phase**: Phase 2 Core (Harness) + Phase 2 Advanced (CLI cloud only)
> **Status**: Design approved — Harness: tạo tasks ngay. CLI cloud: deferred.
> **Depends on**: P2-11 (AgentRunner), P2-20 (ModelSelector), dispatch-loop

---

## 1. Concept

Server không tương tác trực tiếp với model. Thay vào đó, Server ↔ Harness ↔ Model.

```
┌─────────────────┐
│  Server (Body)   │
│  - spawn/kill    │
│  - receive report│
│  - requeue tasks │
└────────┬────────┘
         │ two-way binding
         │ (stdin/stdout + HTTP callback)
┌────────▼────────┐
│  Harness         │
│  - context guard │
│  - model lifecycle│
│  - force di chúc │
│  - difficulty eval│
└────────┬────────┘
         │ direct LLM control
         │ (adapter.chat())
┌────────▼────────┐
│  Model (LLM)     │
│  - execute task  │
│  - tool calls    │
│  - write report  │
└─────────────────┘
```

**Rule: Server chỉ biết Harness. Server không bao giờ gọi LLM trực tiếp.**

---

## 2. Adapter Lifecycle — 4 bước per task

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ ĐÁNH GIÁ │ →  │  START   │ →  │ INJECT  │ →  │  KILL   │ → loop
│          │    │          │    │          │    │          │
│ - VRAM?  │    │ - Load   │    │ - Task   │    │ - Unload │
│ - Model? │    │   model  │    │   payload│    │   model  │
│ - Diff?  │    │ - Warm up│    │ - Monitor│    │ - Free   │
│          │    │          │    │   context│    │   VRAM   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

Mỗi task = clean slate. Không giữ model trong VRAM giữa các tasks.

### Tại sao?

- RTX 5060 Ti 16GB — VRAM quý, không nên chiếm khi idle
- Model nhỏ (4B/7B) — hallucination cao, fresh load = clean state
- Load/unload overhead: ~1-2s trên NVMe SSD cho 7B model
- 10 load/unload per hour = ~20s overhead — chấp nhận được
- VRAM designed cho constant read/write (game render 2K 60fps còn nặng hơn)
- SSD read-only khi load model — không hại write cycles

---

## 3. Context Guardian — "Di chúc" Flow

Harness monitor context usage mỗi LLM response:

```
adapter.chat() → response
  → tokenCounter.addUsage(response.tokenUsage)
  → contextUsagePercent = used / limit

if contextUsagePercent < 85%:
  → continue task normally

if contextUsagePercent >= 85%:
  → STOP current task
  → Inject "di chúc" prompt to model:

    "STOP. Bạn đang hết context window.
     Viết handover report ngay:
     1. Đã hoàn thành gì? (files, changes)
     2. Đang làm dở gì?
     3. Còn gì chưa bắt đầu?
     4. Bước tiếp theo cụ thể cho worker kế tiếp?"

  → Model writes handover report
  → Harness gửi report → Server
  → Server kill worker
  → Server spawn worker mới với handover report làm initial context
  → Worker mới tiếp tục từ chỗ dừng
```

### Tại sao "di chúc" tốt hơn checkpoint file?

| Approach | Pros | Cons |
|----------|------|------|
| Checkpoint file (hiện tại) | Simple | Structured data only, mất reasoning context |
| Di chúc (model tự viết) | Model biết rõ nhất mình đang nghĩ gì, tự tóm tắt | Tốn thêm ~500 tokens cho di chúc |

**Model tự viết handover cho chính nó (thế hệ sau) — không mất context vì model hiểu nhất.**

---

## 4. Difficulty Router — 3 Tiers

Mở rộng ModelSelector hiện tại từ 2 tiers → 3 tiers:

| Tier | Difficulty | Model | Context | VRAM | Khi nào |
|------|-----------|-------|---------|------|---------|
| **Lite** | Simple tasks | 4B (Q4) | 16K | ~4GB | create file, rename, small edit, formatting |
| **Standard** | Normal tasks | 7B-9B (Q4) | 32K | ~8-10GB | implement feature, refactor, fix bug |
| **Cloud** | Complex tasks | Gemini/Cloud CLI | Unlimited | 0 | architecture, multi-file debug, complex reasoning |

### Difficulty signals

```typescript
interface DifficultySignals {
  action: string;           // 'create' vs 'implement' vs 'debug' vs 'architect'
  targetFileCount: number;  // 1 file = simple, 5+ = complex
  doneCriteriaCount: number; // 2 criteria = simple, 8+ = complex
  hasMultiModuleDeps: boolean; // touches multiple modules
  pastFailures: number;     // from case bank — similar tasks failed before
}

function evaluateDifficulty(signals: DifficultySignals): 'lite' | 'standard' | 'cloud' {
  let score = 0;

  // Action type
  if (['create', 'format', 'rename'].includes(signals.action)) score += 1;
  else if (['implement', 'refactor', 'fix'].includes(signals.action)) score += 2;
  else if (['debug', 'architect', 'migrate'].includes(signals.action)) score += 3;

  // Scope
  if (signals.targetFileCount > 5) score += 2;
  else if (signals.targetFileCount > 2) score += 1;

  // Complexity
  if (signals.doneCriteriaCount > 6) score += 2;
  else if (signals.doneCriteriaCount > 3) score += 1;

  // Cross-module
  if (signals.hasMultiModuleDeps) score += 2;

  // Past failures (case bank insight)
  score += Math.min(signals.pastFailures, 3);

  // Route
  if (score <= 3) return 'lite';      // 4B
  if (score <= 7) return 'standard';  // 7B-9B
  return 'cloud';                     // Gemini/Cloud
}
```

---

## 5. Scope — Local vs Cloud

### Local (Ollama) — Phase 2 Core ✅ (làm ngay)

| Feature | Status |
|---------|--------|
| Context Guardian (85% threshold) | Implementable — Ollama API returns exact token counts |
| Di chúc flow | Implementable — Harness controls chat loop directly |
| Load/unload per task | Implementable — `ollama.unload()` already works |
| Difficulty routing (lite/standard) | Implementable — ModelSelector exists |

### Cloud CLI — Phase 2 Advanced (deferred)

| Feature | Problem |
|---------|---------|
| Context measurement | CLI doesn't expose token counts |
| Mid-task interrupt | Hard to interrupt CLI session gracefully |
| Force di chúc | Can't inject prompt into CLI session |
| Quota management | Free tier limits unpredictable |

**Cloud CLI solution deferred — needs separate research on quota harness.**

---

## 6. Impact on Existing Code

| File | Change needed |
|------|---------------|
| `agent-runner.ts` | Refactor into Harness class — extract chat loop, add context guardian |
| `model-selector.ts` | Extend to 3 tiers (lite/standard/cloud) + difficulty evaluation |
| `dispatch-loop.ts` | Update to use Harness interface instead of raw process spawn |
| `adapters/index.ts` | Factory supports 'ollama' + future 'cloud' |
| `token-counter.ts` | Add threshold callback (`onThreshold(85%)`) |

### What stays the same

- `OllamaAdapter` — raw LLM API stays unchanged
- `ProcessManager` — spawn/kill stays unchanged
- `VramManager` — monitoring stays unchanged
- Server HTTP endpoints — unchanged

---

## 7. Task Breakdown (khi ready)

| Task | Description | Priority | Phase |
|------|-------------|----------|-------|
| P2-29 | Extract Harness class from agent-runner, wrap adapter + context guard | 14 | Core (ngay) |
| P2-30 | Implement context handover flow (85% threshold → handover → respawn) | 15 | Core (ngay) |
| P2-31 | Extend ModelSelector to 3-tier difficulty routing | 16 | Core (ngay) |
| P2-32 | Server-side respawn with handover context | 17 | Core (ngay) |
| P2-39 | Cloud CLI adapter research + quota harness | TBD | Advanced (later) |

> **Task IDs are final.** Task files created in `tasks/pending/`.

---

## 8. Key Principles

1. **Server ↔ Harness only** — Server never talks to model directly
2. **Clean slate per task** — load model → work → unload. No residual VRAM
3. **Di chúc over checkpoint** — model writes its own handover, richer than structured data
4. **Difficulty routing** — right model for the job, not one-size-fits-all
5. **Local first, cloud fallback** — only use cloud when local model can't handle complexity
