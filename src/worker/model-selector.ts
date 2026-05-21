import type { TaskDef } from '../models/task.js';
import type { TaskQueueStatus } from '../mcp-server/task-queue.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import { SYSTEM_MESSAGE } from '../constants.js';

export interface ModelProfile {
  mode: 'lite' | 'standard' | 'cloud';
  model: string;
  num_ctx: number;
  max_workers: number;
  estimated_vram_gb: number;
}

export interface DifficultySignals {
  action: string;
  targetFileCount: number;
  doneCriteriaCount: number;
  hasMultiModuleDeps: boolean;
}

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

export function evaluateDifficulty(signals: DifficultySignals): ModelProfile['mode'] {
  let score = 0;

  const actionScores: Record<string, number> = {
    create: 1,
    format: 1,
    rename: 1,
    implement: 2,
    refactor: 2,
    fix: 2,
    debug: 3,
    architect: 3,
    migrate: 3
  };
  score += actionScores[signals.action] || 2;

  if (signals.targetFileCount > 5) score += 2;
  else if (signals.targetFileCount > 2) score += 1;

  if (signals.doneCriteriaCount > 6) score += 2;
  else if (signals.doneCriteriaCount > 3) score += 1;

  if (signals.hasMultiModuleDeps) score += 2;

  if (score <= 3) return 'lite';
  if (score <= 7) return 'standard';
  return 'cloud';
}

export class ModelSelector {
  private ollamaAdapter: OllamaAdapter;

  constructor() {
    this.ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_BASE_URL);
  }

  /**
   * Selects the appropriate model profile based on task and queue status.
   */
  async selectProfile(task: TaskDef, queueStatus: TaskQueueStatus): Promise<ModelProfile> {
    const signals: DifficultySignals = {
      action: task.action || 'implement',
      targetFileCount: Array.isArray((task as any).target_files) ? (task as any).target_files.length : 1,
      doneCriteriaCount: Array.isArray((task as any).done_criteria) ? (task as any).done_criteria.length : 2,
      hasMultiModuleDeps: this.detectMultiModule(task),
    };

    const difficulty = evaluateDifficulty(signals);
    const tier = (difficulty === 'cloud' && !process.env.ORCHESTRATOR_MODEL_CLOUD)
      ? 'standard'
      : difficulty;
    const profile: ModelProfile = { ...PROFILES[tier] };

    await this.checkVRAM(profile);

    console.log(`  [ModelSelector] Task ${task.id}: difficulty=${difficulty} -> ${profile.mode} (${profile.model})`);
    return profile;
  }

  private detectMultiModule(task: TaskDef): boolean {
    const targetFiles = Array.isArray((task as any).target_files) ? (task as any).target_files : [];
    const modules = new Set<string>();

    for (const file of targetFiles) {
      if (typeof file !== 'string') continue;
      const normalized = file.replace(/\\/g, '/');
      const match = normalized.match(/^src\/([^/]+)/);
      if (match) modules.add(match[1]);
    }

    return modules.size > 1;
  }

  /**
   * Checks VRAM availability via Ollama /api/ps.
   */
  private async checkVRAM(profile: ModelProfile): Promise<void> {
    try {
      const psData = await this.ollamaAdapter.ps();
      // psData has models[] which currently occupy VRAM.
      // We don't have total free VRAM easily from Ollama API without nvidia-smi.
      // But we can check what's loaded.
      // Actually, if we just want to log a warning, let's just log it.
      // For a proper check, we would run nvidia-smi if available.
      let hasNvidiaSmi = false;
      let freeVramGB = 0;
      try {
        const { execSync } = await import('child_process');
        const output = execSync('nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits', { encoding: 'utf-8' });
        const freeMb = parseInt(output.trim().split('\n')[0], 10);
        if (!isNaN(freeMb)) {
          hasNvidiaSmi = true;
          freeVramGB = freeMb / 1024;
        }
      } catch (err) {
        // nvidia-smi not available
      }

      if (hasNvidiaSmi && freeVramGB < profile.estimated_vram_gb) {
        console.warn(SYSTEM_MESSAGE.MODEL_WARNING_VRAM(profile.mode, profile.estimated_vram_gb, freeVramGB));
      }

    } catch (err) {
      console.warn(SYSTEM_MESSAGE.MODEL_CHECK_ERROR((err as Error).message));
    }
  }
}
