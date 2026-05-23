import {
  RUNTIME_HEALTH_PROBE_STATUS,
  RUNTIME_HEARTBEAT_STATUS,
} from './constants.js';
import type {
  RuntimeHeartbeat,
  RuntimeIdentity,
} from './models.js';
import { deriveNextHealthCheckDelayMs } from '../utils/lifecycle-timing.js';

export class HeartbeatStore {
  private readonly heartbeats = new Map<string, RuntimeHeartbeat>();

  recordHeartbeat(identity: RuntimeIdentity, staleThresholdMs: number, nowMs: number = Date.now()): RuntimeHeartbeat {
    const nextHealthCheckDelayMs = deriveNextHealthCheckDelayMs(staleThresholdMs, nowMs, nowMs);
    const heartbeat: RuntimeHeartbeat = {
      ...identity,
      status: RUNTIME_HEARTBEAT_STATUS.HEALTHY,
      last_seen_at: new Date(nowMs).toISOString(),
      stale_at: new Date(nowMs + staleThresholdMs).toISOString(),
      last_health_check_at: new Date(nowMs).toISOString(),
      next_health_check_at: new Date(nowMs + nextHealthCheckDelayMs).toISOString(),
      last_health_probe_status: RUNTIME_HEALTH_PROBE_STATUS.PASSED,
      last_health_probe_at: new Date(nowMs).toISOString(),
    };
    this.heartbeats.set(identity.runtime_id, heartbeat);
    return heartbeat;
  }

  markHealthCheck(identity: RuntimeIdentity, staleThresholdMs: number, nowMs: number = Date.now()): RuntimeHeartbeat {
    return this.recordHeartbeat(identity, staleThresholdMs, nowMs);
  }

  markProbe(identity: RuntimeIdentity, ok: boolean, nowMs: number = Date.now()): RuntimeHeartbeat | null {
    const heartbeat = this.heartbeats.get(identity.runtime_id);
    if (!heartbeat) return null;
    const updated: RuntimeHeartbeat = {
      ...heartbeat,
      status: ok ? RUNTIME_HEARTBEAT_STATUS.HEALTHY : RUNTIME_HEARTBEAT_STATUS.STALE,
      last_health_check_at: new Date(nowMs).toISOString(),
      last_health_probe_at: new Date(nowMs).toISOString(),
      last_health_probe_status: ok ? RUNTIME_HEALTH_PROBE_STATUS.PASSED : RUNTIME_HEALTH_PROBE_STATUS.FAILED,
    };
    this.heartbeats.set(identity.runtime_id, updated);
    return updated;
  }

  get(runtimeId: string): RuntimeHeartbeat | null {
    return this.heartbeats.get(runtimeId) ?? null;
  }

  isStale(runtimeId: string, nowMs: number = Date.now()): boolean {
    const heartbeat = this.heartbeats.get(runtimeId);
    if (!heartbeat) return false;
    return Date.parse(heartbeat.stale_at) <= nowMs;
  }

  remove(runtimeId: string): void {
    this.heartbeats.delete(runtimeId);
  }
}
