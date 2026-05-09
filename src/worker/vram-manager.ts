import { execSync } from 'child_process';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import type { ModelProfile } from './model-selector.js';
import { SYSTEM_MESSAGE } from '../constants.js';

export interface VramStatus {
  used_mb: number;
  total_mb: number;
  percentage: number;
}

export class VramManager {
  private ollamaAdapter: OllamaAdapter;
  private monitorInterval: NodeJS.Timeout | null = null;
  private hasNvidiaSmi: boolean = true;

  constructor(baseUrl?: string) {
    this.ollamaAdapter = new OllamaAdapter(baseUrl || process.env.OLLAMA_BASE_URL);
  }

  /**
   * call ollama.unload(model) after worker exits
   */
  async unloadAfterUse(model: string): Promise<void> {
    try {
      await this.ollamaAdapter.unload(model);
      console.log(SYSTEM_MESSAGE.VRAM_UNLOADED(model));
    } catch (err) {
      console.error(SYSTEM_MESSAGE.VRAM_UNLOAD_FAILED(model), err);
    }
  }

  /**
   * { used_mb, total_mb, percentage } via nvidia-smi
   */
  checkVram(): VramStatus | null {
    if (!this.hasNvidiaSmi) return null;
    try {
      const output = execSync('nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      if (lines.length > 0) {
        const [usedStr, totalStr] = lines[0].split(',').map(s => s.trim());
        const used_mb = parseInt(usedStr, 10);
        const total_mb = parseInt(totalStr, 10);
        
        if (!isNaN(used_mb) && !isNaN(total_mb) && total_mb > 0) {
          return {
            used_mb,
            total_mb,
            percentage: (used_mb / total_mb) * 100
          };
        }
      }
    } catch (err) {
      this.hasNvidiaSmi = false; // Disable if fails (e.g., no nvidia-smi installed)
    }
    return null;
  }

  /**
   * boolean — check if enough VRAM for model
   */
  canSpawn(profile: ModelProfile): boolean {
    const status = this.checkVram();
    if (!status) return true; // Optimistic if no nvidia-smi

    const freeGb = (status.total_mb - status.used_mb) / 1024;
    return freeGb >= profile.estimated_vram_gb;
  }

  /**
   * periodic VRAM + Ollama health check
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitorInterval) {
      this.stopMonitoring();
    }

    // Do an initial check to populate this.hasNvidiaSmi
    this.checkVram();

    this.monitorInterval = setInterval(async () => {
      try {
        // 1. Ollama alive?
        const isAlive = await this.ollamaAdapter.health();
        if (!isAlive) {
          console.warn(SYSTEM_MESSAGE.VRAM_OLLAMA_DOWN);
        }

        // 2. Models loaded?
        const psData = await this.ollamaAdapter.ps();
        const loadedModels = psData?.models?.map((m: any) => m.name).join(', ') || 'None';
        // (Just fetching them to verify Ollama status as requested)

        // 3. VRAM usage?
        const vramStatus = this.checkVram();
        if (vramStatus) {
          // 4. Alert if VRAM > 90%
          if (vramStatus.percentage > 90) {
            console.warn(SYSTEM_MESSAGE.VRAM_ALERT_HIGH(vramStatus.percentage, loadedModels));
          }
        }
      } catch (err) {
        console.error(SYSTEM_MESSAGE.VRAM_CHECK_ERROR, err);
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
}
