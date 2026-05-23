import os from 'node:os';
import type { InfraVramSnapshot, VerifiedInfraCapacity } from './models.js';

export interface InfraVerifierDeps {
  getVramStatus(): InfraVramSnapshot;
}

export class InfraVerifier {
  constructor(private readonly deps: InfraVerifierDeps) {}

  verify(): VerifiedInfraCapacity {
    const vram = this.deps.getVramStatus();
    const totalRamMb = Math.round(os.totalmem() / 1024 / 1024);
    const availableRamMb = Math.round(os.freemem() / 1024 / 1024);
    const cpuCores = os.cpus().length;

    return {
      provider: vram.available ? 'local-gpu' : 'local-cpu',
      total_vram_mb: vram.total_mb,
      available_vram_mb: typeof vram.total_mb === 'number' && typeof vram.used_mb === 'number'
        ? Math.max(0, vram.total_mb - vram.used_mb)
        : undefined,
      total_ram_mb: totalRamMb,
      available_ram_mb: availableRamMb,
      max_local_runtimes: Math.max(1, cpuCores),
      supported_backends: ['ollama', 'codex-cli', 'ag-cli'],
      checked_at: new Date().toISOString(),
    };
  }
}
