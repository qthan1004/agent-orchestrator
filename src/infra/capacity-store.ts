import type { VerifiedInfraCapacity } from './models.js';

export class CapacityStore {
  private verifiedCapacity: VerifiedInfraCapacity | null = null;

  setVerifiedCapacity(capacity: VerifiedInfraCapacity): void {
    this.verifiedCapacity = capacity;
  }

  getVerifiedCapacity(): VerifiedInfraCapacity | null {
    return this.verifiedCapacity;
  }

  clear(): void {
    this.verifiedCapacity = null;
  }
}
