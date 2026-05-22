# Architecture Gap Analysis: Ollama-Centric vs Harness-Centric

> **Date**: 2026-05-22
> **Type**: Architecture Analysis (post-refactor diagnostic)
> **Status**: Reference — không phải plan thực thi
> **Context**: Phase 2 đã chạy xa theo hướng sai kiến trúc. Document này ghi lại vấn đề gốc rễ để đối chiếu khi sửa.

---

## Bối cảnh

Sau khi Phase 2 được nhiều agent chắp vá, codebase đã refactor lại folders nhưng **kiến trúc cốt lõi vẫn sai**: hệ thống được xây quanh Ollama thay vì quanh Harness.

Đúng theo thiết kế ban đầu (Head-Body-Limb):
- Server dispatches task
- **Harness** nhận task, chạy LLM loop (bất kỳ backend nào), report back
- Backend chỉ là chi tiết bên trong Harness

Thực tế code hiện tại:
- Server check Ollama health → pick Ollama model → spawn process cố định → harness hardcode Ollama adapter
- Codex CLI và AG CLI runtime tồn tại trong code nhưng **không bao giờ được gọi** từ dispatch flow

---

## 1. Evidence: Code chỉ biết Ollama

### 1.1. dispatch-loop.ts — Dispatch bị khóa vào Ollama

```
File: src/worker/dispatch-loop.ts
```

**Line 152**: Health check chỉ Ollama — nếu Ollama chết, toàn bộ dispatch dừng:
```typescript
const ollamaAvailable = await this.runtimeManager.isBackendHealthy({ 
  backend: RUNTIME_BACKEND.OLLAMA 
});
if (!ollamaAvailable) {
  this.logOllamaUnavailable();
  break;  // ← Codex CLI sẵn sàng? AG CLI sẵn sàng? Không quan tâm.
}
```

**Line 206–210**: Backend luôn Ollama, không bao giờ chọn backend khác:
```typescript
const runtimeBackend = {
  backend: RUNTIME_BACKEND.OLLAMA,        // HARDCODED
  model: profile.model,
  endpoint_url: process.env.OLLAMA_BASE_URL,
};
```

**Line 148**: `maxConcurrentWorkers` bị cap = 1 khi shared Ollama (luôn luôn trong dev):
```typescript
// resolveMaxConcurrentWorkers() gọi isSharedOllamaDevFallback()
// Kết quả: maxConcurrentWorkers = 1
// → Không bao giờ chạy 2 model Ollama cùng lúc
// → Không bao giờ chạy Ollama + Codex song song (vì dispatch loop chỉ có 1 path)
```

### 1.2. model-selector.ts — Model selection = Ollama model selection

```
File: src/worker/model-selector.ts
```

**Line 76–80**: Class chỉ biết Ollama:
```typescript
export class ModelSelector {
  private ollamaAdapter: OllamaAdapter;  // ← Chỉ Ollama
  constructor() {
    this.ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_BASE_URL);
  }
}
```

**Line 109**: Resolve model = query Ollama `/api/tags`:
```typescript
const models = await this.ollamaAdapter.listModels();
```

**Line 22–43**: Profiles hardcoded 3 tier — tất cả đều là Ollama models hoặc env var:
```typescript
const PROFILES = {
  lite:     { model: 'qwen3.5:4b-q4_k_m', ... },
  standard: { model: 'qwen3.5:9b-q4_k_m', ... },
  cloud:    { model: 'gemini-2.5-flash', ... },  // model name cho cloud nhưng...
};
// ...cloud profile vẫn đi qua OllamaAdapter.listModels() → không match → fallback
```

### 1.3. runtime-manager.ts — Biết 3 runtime nhưng chỉ dùng 1

```
File: src/runtime/runtime-manager.ts
```

**Line 60–63**: Tạo cả 3 runtime objects:
```typescript
private readonly ollamaRuntime: OllamaRuntime;           // ← dùng trong spawn()
private readonly codexCliRuntime = new CodexCliRuntime(); // ← chỉ dùng trong kill() và isAlive()
private readonly agCliRuntime = new AgCliRuntime();       // ← chỉ dùng trong kill() và isAlive()
```

**`spawn()` method**: Chỉ có Ollama path:
```typescript
spawn(input) {
  const ollamaLease = input.backend.backend === RUNTIME_BACKEND.OLLAMA
    ? this.ollamaRuntime.prepareLease(...)  // ← Ollama: có lease logic
    : null;                                  // ← Codex/AG: null = nothing happens
  
  // Luôn gọi processManager.spawn() — child process kiểu Ollama harness
  const spawned = this.processManager.spawn({
    ...input.payload,
    ollama_base_url: ollamaLease?.ollama_base_url,  // ← Ollama-specific field
  });
}
```

**`release()` method**: Gọi kill tất cả runtime — defensive nhưng không đúng nghĩa:
```typescript
release(identity) {
  this.ollamaRuntime.releaseLease(identity);      // no-op hiện tại
  this.codexCliRuntime.kill(identity.runtime_id);  // kill session nếu có
  this.agCliRuntime.kill(identity.runtime_id);     // kill session nếu có
  // → spray-and-pray: gọi hết vì không biết backend nào đang chạy
}
```

### 1.4. harness/runner.ts — Harness process cũng hardcode Ollama

```
File: src/harness/runner.ts
```

**Line 91–92**: Adapter luôn là Ollama:
```typescript
const harness = new LLMHarness({
  adapter: createAdapter({ 
    adapter: 'ollama',                            // HARDCODED
    baseUrl: payload.ollama_base_url || ...
  }),
  ...
});
```

### 1.5. mcp-server/index.ts — Server init cũng Ollama-centric

```
File: src/mcp-server/index.ts
```

**Line 103–108**: Khởi tạo Ollama trước mọi thứ:
```typescript
const ollamaReady = await ensureOllamaRunning(ollamaBaseUrl);
if (!ollamaReady) {
  console.warn(SYSTEM_MESSAGE.OLLAMA_NOT_AVAILABLE);
  // → warning nhưng tiếp tục. Dispatch loop sẽ block ở health check.
}
```

**Line 111–113**: Tạo Ollama components trực tiếp trong server init:
```typescript
const ollamaAdapter = new OllamaAdapter(ollamaBaseUrl);
const modelSelector = new ModelSelector();
const vramManager = new VramManager(ollamaBaseUrl);
```

---

## 2. Scenario Test: 4 backends chạy đồng thời

Giả sử cần dispatch cùng lúc:

| # | Backend | Model | VRAM | Process Type |
|---|---------|-------|------|--------------|
| 1 | Ollama | qwen3.5:4b | ~4GB | child process (harness/index.js) |
| 2 | Ollama | qwen3.5:9b | ~10GB | child process (harness/index.js) |
| 3 | Codex CLI | codex-mini | 0 (cloud) | subprocess (codex binary) |
| 4 | AG CLI | gemini-2.5-flash | 0 (cloud) | subprocess (ag binary) |

### Hiện tại xảy ra gì:

| Khía cạnh | Hiện tại | Đúng ra |
|-----------|----------|---------|
| **Health check** | Chỉ check Ollama. Ollama chết = block tất cả, kể cả cloud backends sẵn sàng | Mỗi backend health check riêng. Ollama chết ≠ Codex bị block |
| **Backend selection** | Không có. Luôn Ollama | Scheduler quyết định backend type dựa trên task + capacity |
| **Model selection** | `ModelSelector` query Ollama `/api/tags` | Mỗi backend có model list riêng (Ollama: tags, Codex: hardcoded, AG: API) |
| **Concurrent workers** | Cap = 1 (shared Ollama) | Ollama slots + Cloud slots tính riêng |
| **Spawn** | Luôn `processManager.spawn()` → `harness/index.js` | Ollama: spawn harness. Codex: spawn codex binary. AG: spawn ag binary |
| **Heartbeat** | Process stdout timer (processManager) | Mỗi backend type có heartbeat phù hợp |
| **Alive detection** | PID check trong processManager | Ollama: PID. Codex: session. AG: session |
| **Kill** | SIGTERM → SIGKILL | CLI backends có thể cần graceful stop command |
| **Lease release** | Spray-and-pray: gọi kill trên cả 3 runtime | Biết chính xác backend → gọi cleanup đúng adapter |
| **VRAM** | Chỉ Ollama VRAM. Cloud = ??? | Cloud = 0 VRAM, unlimited slots (hoặc rate-limited) |

### Kịch bản Qwen 4B + Qwen 7B cùng shared Ollama:

```
1. Task A vào → ModelSelector chọn 'lite' → qwen3.5:4b
2. Task B vào → ModelSelector chọn 'standard' → qwen3.5:9b
3. maxConcurrentWorkers = 1 (isSharedOllamaDevFallback = true)
   → Task B chờ Task A xong
   → KHÔNG BAO GIỜ chạy song song 2 model trên cùng Ollama
```

---

## 3. Kiến trúc đúng: Harness là đơn vị thực thi

### Nguyên tắc

- **1 spawn = 1 Harness** — không phải 1 Ollama process
- Harness là abstraction chung cho mọi backend
- Backend chỉ là implementation detail bên trong Harness
- Server/Scheduler không biết (và không cần biết) backend chạy bằng gì

### Mô hình

```
Server (Head)
  │
  Scheduler ──→ picks task ──→ BackendRouter decides: backend + model + capacity
  │
  RuntimeManager.spawn(routing_decision, task)
  │
  ├── OllamaHarnessAdapter
  │     spawn() → child process: harness/index.js
  │     LLMHarness loop bên trong
  │     Heartbeat: stdout timer
  │     Alive: PID check
  │     Kill: SIGTERM → SIGKILL
  │     Cleanup: unload model nếu không còn lease nào dùng
  │
  ├── CodexCliHarnessAdapter  
  │     spawn() → subprocess: codex --task "..."
  │     Codex có LLM loop riêng — không cần LLMHarness
  │     Heartbeat: process alive check (stdout có thể silent)
  │     Kill: SIGTERM
  │     Cleanup: nothing (cloud)
  │
  └── AgCliHarnessAdapter
        spawn() → subprocess: ag --task "..."
        AG CLI có loop riêng
        Heartbeat: process alive check
        Kill: SIGTERM
        Cleanup: nothing (cloud)
```

### Interface chính

```typescript
interface HarnessAdapter {
  readonly backend: RuntimeBackendType;
  healthCheck(): Promise<boolean>;
  spawn(input: HarnessSpawnInput): HarnessHandle;
  estimateCapacity(config: HarnessConfig): CapacityEstimate;
  cleanup(identity: RuntimeIdentity): Promise<void>;
}

interface HarnessHandle {
  pid: number;
  runtimeIdentity: RuntimeIdentity;
  completion: Promise<HarnessOutcome>;
  kill(): void;
  isAlive(): boolean;
}
```

### Dispatch flow đúng

```
1. Scheduler picks task from queue
2. BackendRouter.decide(task, availableCapacity) → RoutingDecision
   - task dễ + VRAM đủ → { backend: 'ollama', model: 'qwen3.5:4b' }
   - task khó + VRAM đủ → { backend: 'ollama', model: 'qwen3.5:9b' }
   - task khó + VRAM hết → { backend: 'codex_cli', model: 'codex-mini' }
   - escalation → { backend: 'ag_cli', model: 'gemini-2.5-flash' }
3. RuntimeManager.spawn(routingDecision, task)
   → Lookup HarnessAdapter by backend type
   → adapter.healthCheck()
   → PointAllocator.reserve(capacity)
   → adapter.spawn(input) → HarnessHandle
   → HeartbeatStore.record()
4. MonitorHarness(handle)
   → await handle.completion
   → release lease
   → adapter.cleanup()
```

---

## 4. Dependency Direction Problems (Bonus)

Ngoài vấn đề Ollama-centric, dependency graph cũng sai hướng:

```
worker/dispatch-loop.ts
  → imports mcp-server/state-manager   ← NGƯỢC: worker reach vào server
  → imports mcp-server/task-queue      ← NGƯỢC: worker reach vào server

runtime/runtime-manager.ts
  → imports worker/adapters/ollama-adapter  ← NGƯỢC: runtime reach vào worker
  → imports worker/process-manager          ← NGƯỢC: runtime reach vào worker

utils/worker-registry.ts      ← Domain logic trong utils
utils/task-identity-registry.ts ← Domain logic trong utils
utils/identity-invariants.ts    ← Domain logic trong utils
```

Đúng ra:
- **Server** → biết runtime, scheduler, task
- **Runtime** → biết runtime-adapters, infra
- **Worker/Harness** → biết adapters (LLM), tools
- **Utils** → chỉ chứa pure utilities (file I/O, logging)

---

## 5. Mức độ nghiêm trọng

| Vấn đề | Mức | Ghi chú |
|--------|-----|---------|
| Dispatch loop chỉ biết Ollama | 🔴 Critical | Không thể thêm backend mới mà không sửa core loop |
| ModelSelector = OllamaModelSelector | 🔴 Critical | Không có khái niệm "chọn backend" |
| RuntimeManager spawn chỉ có Ollama path | 🔴 Critical | Codex/AG runtime objects tồn tại nhưng dead code |
| Harness runner hardcode Ollama adapter | 🟡 Medium | Chỉ cần đọc backend từ payload thay vì hardcode |
| maxConcurrentWorkers cap=1 khi shared | 🟡 Medium | Chặn concurrent execution |
| Dependency direction ngược | 🟡 Medium | Sẽ tạo circular deps khi scale |
| Root constants.ts monolithic | 🟠 Low | Khó maintain nhưng không chặn tính năng |
| Domain logic trong utils/ | 🟠 Low | Misplaced nhưng hoạt động được |

---

## 6. Kết luận

Code hiện tại hoạt động cho **1 Ollama model chạy 1 task 1 lúc**. Nhưng:

- Thêm backend mới (Codex, AG CLI) = sửa dispatch loop + model selector + runtime manager + harness runner → **4+ files core**
- Chạy concurrent backends = rewrite capacity accounting + dispatch flow
- Scale workers = rewrite maxConcurrentWorkers logic

Vấn đề không phải code quality mà là **sai kiến trúc cơ bản**. Refactor folders đã xong, nhưng dispatch flow vẫn là "Ollama-only pipeline" thay vì "Harness pipeline với pluggable backends".

Document này để reference khi chuẩn bị sửa kiến trúc.
