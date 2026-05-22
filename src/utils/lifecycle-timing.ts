const MIN_HEALTH_CHECK_INTERVAL_MS = 1_000;
const MAX_HEALTH_CHECK_LEAD_MS = 5_000;
const HEALTH_CHECK_LEAD_RATIO = 0.2;

export function deriveHealthCheckLeadMs(staleThresholdMs: number): number {
  if (!Number.isFinite(staleThresholdMs) || staleThresholdMs <= 0) {
    return MIN_HEALTH_CHECK_INTERVAL_MS;
  }

  const raw = Math.floor(staleThresholdMs * HEALTH_CHECK_LEAD_RATIO);
  return Math.min(Math.max(raw, MIN_HEALTH_CHECK_INTERVAL_MS), MAX_HEALTH_CHECK_LEAD_MS);
}

export function deriveNextHealthCheckDelayMs(staleThresholdMs: number, lastHealthCheckAt: number, now: number = Date.now()): number {
  if (!Number.isFinite(staleThresholdMs) || staleThresholdMs <= 0) {
    return MIN_HEALTH_CHECK_INTERVAL_MS;
  }

  const leadMs = deriveHealthCheckLeadMs(staleThresholdMs);
  const elapsedMs = Math.max(0, now - lastHealthCheckAt);
  return Math.max(MIN_HEALTH_CHECK_INTERVAL_MS, staleThresholdMs - leadMs - elapsedMs);
}

export function deriveHealthCheckIntervalMs(staleThresholdMs: number): number {
  return deriveNextHealthCheckDelayMs(staleThresholdMs, Date.now(), Date.now());
}
