import type { TaskDef } from '../models/task.js';
import type { TaskQueueStatus } from '../mcp-server/task-queue.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';

export interface ModelProfile {
  mode: 'quality' | 'throughput';
  model: string;
  num_ctx: number;
  max_workers: number;
  estimated_vram_gb: number;
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
    const isStandalone = !task.dependencies || (Array.isArray(task.dependencies) && task.dependencies.length === 0);
    const pendingCount = queueStatus.pending;

    let profile: ModelProfile;

    if (isStandalone && pendingCount >= 3) {
      // THROUGHPUT (2 × 4B, 16K ctx)
      profile = {
        mode: 'throughput',
        model: process.env.ORCHESTRATOR_MODEL_THROUGHPUT || 'qwen3.5:4b-q4_k_m',
        num_ctx: 16384,
        max_workers: 2,
        estimated_vram_gb: 6 // Approx
      };
    } else {
      // QUALITY (1 × 9B, 32K ctx)
      profile = {
        mode: 'quality',
        model: process.env.ORCHESTRATOR_MODEL_QUALITY || 'qwen3.5:9b-q4_k_m',
        num_ctx: 32768,
        max_workers: 1,
        estimated_vram_gb: 10 // Approx
      };
    }

    await this.checkVRAM(profile);

    return profile;
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
        console.warn(`[WARNING] Selected ${profile.mode} profile requires ~${profile.estimated_vram_gb}GB VRAM, but only ~${freeVramGB.toFixed(1)}GB is free.`);
      }

    } catch (err) {
      console.warn(`[WARNING] Failed to check VRAM: ${(err as Error).message}`);
    }
  }
}
