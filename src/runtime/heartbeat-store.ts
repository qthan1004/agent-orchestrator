import {
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
    };
    this.heartbeats.set(identity.runtime_id, heartbeat);
    return heartbeat;
  }

  markHealthCheck(identity: RuntimeIdentity, staleThresholdMs: number, nowMs: number = Date.now()): RuntimeHeartbeat {
    return this.recordHeartbeat(identity, staleThresholdMs, nowMs);
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
