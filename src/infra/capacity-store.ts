import type { InfraWarmModelCacheSnapshot, VerifiedInfraCapacity } from './models.js';

export class CapacityStore {
  private verifiedCapacity: VerifiedInfraCapacity | null = null;
  private readonly warmModelCache = new Map<string, InfraWarmModelCacheSnapshot>();

  setVerifiedCapacity(capacity: VerifiedInfraCapacity): void {
    this.verifiedCapacity = capacity;
  }

  getVerifiedCapacity(): VerifiedInfraCapacity | null {
    return this.verifiedCapacity;
  }

  clear(): void {
    this.verifiedCapacity = null;
    this.warmModelCache.clear();
  }

  setWarmModelCacheEntry(entry: InfraWarmModelCacheSnapshot): void {
    this.warmModelCache.set(this.cacheKey(entry.key), entry);
  }

  getWarmModelCache(): InfraWarmModelCacheSnapshot[] {
    const now = Date.now();
    for (const [key, entry] of this.warmModelCache.entries()) {
      if (Date.parse(entry.expires_at) <= now) {
        this.warmModelCache.delete(key);
      }
    }
    return Array.from(this.warmModelCache.values());
  }

  evictWarmModelCache(key: InfraWarmModelCacheSnapshot['key']): void {
    this.warmModelCache.delete(this.cacheKey(key));
  }

  private cacheKey(key: InfraWarmModelCacheSnapshot['key']): string {
    return `${key.backend}:${key.model}:${key.endpoint_url ?? ''}`;
  }
}
