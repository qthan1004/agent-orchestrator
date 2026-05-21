# Task P2-31: Difficulty-based Model Routing (3 Tiers)

## Info
- **ID:** P2-31-difficulty-routing
- **Module:** `src/worker/model-selector.ts`
- **Group:** Core — LLM Harness
- **Dependencies:** P2-29, P2-20
- **Priority:** 16
- **Ref:** `dev-docs/2026-05-21_design_llm-harness-wrapper.md` Section 4

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Design Context

The current `ModelSelector` has 2 tiers (throughput vs quality) chosen by queue depth alone.

This task extends it to **3 tiers** based on **task difficulty**, not just queue depth.

Rationale:
- Simple tasks (create file, rename) waste resources on a 9B model
- Complex tasks (architecture, multi-file debug) hallucinate on a 4B model
- Cloud models have no VRAM cost — use for tasks that exceed local model capability

## What to do

### 1. Add difficulty evaluation function

```typescript
interface DifficultySignals {
  action: string;              // 'create' | 'implement' | 'debug' | 'architect'
  targetFileCount: number;     // from task metadata
  doneCriteriaCount: number;   // from task definition
  hasMultiModuleDeps: boolean; // touches multiple src/ subdirs
}

function evaluateDifficulty(signals: DifficultySignals): 'lite' | 'standard' | 'cloud' {
  let score = 0;

  // Action type weight
  const actionScores: Record<string, number> = {
    create: 1, format: 1, rename: 1,
    implement: 2, refactor: 2, fix: 2,
    debug: 3, architect: 3, migrate: 3
  };
  score += actionScores[signals.action] || 2;

  // Scope weight
  if (signals.targetFileCount > 5) score += 2;
  else if (signals.targetFileCount > 2) score += 1;

  // Complexity weight
  if (signals.doneCriteriaCount > 6) score += 2;
  else if (signals.doneCriteriaCount > 3) score += 1;

  // Cross-module weight
  if (signals.hasMultiModuleDeps) score += 2;

  if (score <= 3) return 'lite';
  if (score <= 7) return 'standard';
  return 'cloud';
}
```

### 2. Define 3-tier model profiles

```typescript
const PROFILES = {
  lite: {
    mode: 'lite' as const,
    model: process.env.ORCHESTRATOR_MODEL_LITE || 'qwen3.5:4b-q4_k_m',
    num_ctx: 16384,
    max_workers: 2,
    estimated_vram_gb: 4,
  },
  standard: {
    mode: 'standard' as const,
    model: process.env.ORCHESTRATOR_MODEL_STANDARD || 'qwen3.5:9b-q4_k_m',
    num_ctx: 32768,
    max_workers: 1,
    estimated_vram_gb: 10,
  },
  cloud: {
    mode: 'cloud' as const,
    model: process.env.ORCHESTRATOR_MODEL_CLOUD || 'gemini-2.5-flash',
    num_ctx: 131072,
    max_workers: 1,
    estimated_vram_gb: 0,
  }
};
```

### 3. Update `selectProfile()` method

Replace queue-depth-only logic with difficulty-based routing:

```typescript
async selectProfile(task: TaskDef, queueStatus: TaskQueueStatus): Promise<ModelProfile> {
  const signals: DifficultySignals = {
    action: task.action || 'implement',
    targetFileCount: (task as any).target_files?.length || 1,
    doneCriteriaCount: (task as any).done_criteria?.length || 2,
    hasMultiModuleDeps: this.detectMultiModule(task),
  };

  const difficulty = evaluateDifficulty(signals);

  // Cloud fallback: cap at 'standard' if cloud adapter not configured
  const tier = (difficulty === 'cloud' && !process.env.ORCHESTRATOR_MODEL_CLOUD)
    ? 'standard'
    : difficulty;

  const profile = { ...PROFILES[tier] };
  await this.checkVRAM(profile);

  console.log(`  [ModelSelector] Task ${task.id}: difficulty=${difficulty} → ${profile.mode} (${profile.model})`);
  return profile;
}
```

### 4. Update `ModelProfile` type

```typescript
interface ModelProfile {
  mode: 'lite' | 'standard' | 'cloud';  // replaces 'quality' | 'throughput'
  model: string;
  num_ctx: number;
  max_workers: number;
  estimated_vram_gb: number;
}
```

### 5. Update dispatch-loop.ts

Replace any references to `profile.mode === 'quality'` or `'throughput'` with new mode names.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/model-selector.ts` |
| MODIFY | `src/worker/dispatch-loop.ts` (if references old mode names) |

## Done Criteria
- [ ] `evaluateDifficulty()` function scores task by action, scope, complexity
- [ ] 3 tiers: `lite` (4B), `standard` (7B-9B), `cloud` (Gemini/fallback)
- [ ] `selectProfile()` uses difficulty signals instead of only queue depth
- [ ] Cloud tier gracefully falls back to `standard` if not configured
- [ ] `ModelProfile.mode` updated from `quality|throughput` → `lite|standard|cloud`
- [ ] Environment variables: `ORCHESTRATOR_MODEL_LITE`, `ORCHESTRATOR_MODEL_STANDARD`, `ORCHESTRATOR_MODEL_CLOUD`
- [ ] Difficulty evaluation logged for observability
- [ ] `npm run build` passes
