# Task P2-07: ModelSelector

## Info
- **ID:** P2-07-model-selector
- **Module:** `src/worker/model-selector.ts` (NEW)
- **Group:** Sprint 1 (Ollama + Process Management)
- **Dependencies:** P2-05
- **Priority:** 7
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 4.2

## What to do

Tạo `ModelSelector` — dynamic Quality/Throughput model selection.

### API:

```typescript
selectProfile(task: TaskDef, queueStatus: QueueStatus): ModelProfile

interface ModelProfile {
  mode: 'quality' | 'throughput';
  model: string;        // e.g. 'qwen3.5:9b-q4_k_m'
  num_ctx: number;      // 32768 or 16384
  max_workers: number;  // 1 or 2
  estimated_vram_gb: number;
}
```

### Logic:
```
const isStandalone = task.dependencies?.length === 0;
const pendingCount = queueStatus.pending;

if (isStandalone && pendingCount >= 3) → THROUGHPUT (2 × 4B, 16K ctx)
else → QUALITY (1 × 9B, 32K ctx)
```

### Model configs (configurable via env/config):
- Quality: `ORCHESTRATOR_MODEL_QUALITY` or `qwen3.5:9b-q4_k_m`
- Throughput: `ORCHESTRATOR_MODEL_THROUGHPUT` or `qwen3.5:4b-q4_k_m`

### VRAM check:
- Use OllamaClient.ps() or `nvidia-smi` to check available VRAM
- Log warning if insufficient for selected profile

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/model-selector.ts` |

## Verification
```bash
npm run build
# Unit test: mock inputs → correct profile selected
```

## Done Criteria
- [ ] Quality profile: 1 worker, 9B model, 32K ctx
- [ ] Throughput profile: 2 workers, 4B model, 16K ctx
- [ ] VRAM check logs warning if insufficient
- [ ] Model names configurable via env vars
- [ ] `npm run build` pass
