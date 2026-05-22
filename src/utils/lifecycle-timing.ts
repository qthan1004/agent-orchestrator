import { RUNTIME_TIMING_DEFAULTS } from '../runtime/index.js';

export function deriveHealthCheckLeadMs(staleThresholdMs: number): number {
  if (!Number.isFinite(staleThresholdMs) || staleThresholdMs <= 0) {
    return RUNTIME_TIMING_DEFAULTS.MIN_HEALTH_CHECK_INTERVAL_MS;
  }

  const raw = Math.floor(staleThresholdMs * RUNTIME_TIMING_DEFAULTS.HEALTH_CHECK_LEAD_RATIO);
  return Math.min(
    Math.max(raw, RUNTIME_TIMING_DEFAULTS.MIN_HEALTH_CHECK_INTERVAL_MS),
    RUNTIME_TIMING_DEFAULTS.MAX_HEALTH_CHECK_LEAD_MS
  );
}

export function deriveNextHealthCheckDelayMs(staleThresholdMs: number, lastHealthCheckAt: number, now: number = Date.now()): number {
  if (!Number.isFinite(staleThresholdMs) || staleThresholdMs <= 0) {
    return RUNTIME_TIMING_DEFAULTS.MIN_HEALTH_CHECK_INTERVAL_MS;
  }

  const leadMs = deriveHealthCheckLeadMs(staleThresholdMs);
  const elapsedMs = Math.max(0, now - lastHealthCheckAt);
  return Math.max(RUNTIME_TIMING_DEFAULTS.MIN_HEALTH_CHECK_INTERVAL_MS, staleThresholdMs - leadMs - elapsedMs);
}

export function deriveHealthCheckIntervalMs(staleThresholdMs: number): number {
  return deriveNextHealthCheckDelayMs(staleThresholdMs, Date.now(), Date.now());
}
