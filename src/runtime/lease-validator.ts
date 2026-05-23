import { RUNTIME_HEALTH_PROBE_STATUS } from './constants.js';
import type { RuntimeHeartbeat, RuntimeIdentity, RuntimeLease } from './models.js';

export class LeaseValidator {
  static identityMatches(expected: RuntimeIdentity, received: RuntimeIdentity): boolean {
    return expected.runtime_id === received.runtime_id &&
      expected.worker_id === received.worker_id &&
      expected.task_id === received.task_id &&
      expected.lease_generation === received.lease_generation;
  }

  static ownsLease(lease: RuntimeLease | null, identity: RuntimeIdentity): boolean {
    return Boolean(
      lease &&
      lease.runtime_id === identity.runtime_id &&
      lease.worker_id === identity.worker_id &&
      lease.task_id === identity.task_id &&
      lease.lease_generation === identity.lease_generation
    );
  }

  static canAcceptTerminalCallback(lease: RuntimeLease | null, identity: RuntimeIdentity): boolean {
    return this.ownsLease(lease, identity) && !lease?.terminal_callback_accepted_at;
  }

  static canRecoverLease(input: {
    lease: RuntimeLease | null;
    heartbeat: RuntimeHeartbeat | null;
    identity: RuntimeIdentity;
    serviceAlive: boolean;
    nowMs?: number;
  }): boolean {
    if (!this.ownsLease(input.lease, input.identity)) return false;
    if (!input.heartbeat) return false;
    if (input.lease?.terminal_callback_accepted_at) return false;
    if (input.serviceAlive) return false;
    const nowMs = input.nowMs ?? Date.now();
    return Date.parse(input.heartbeat.stale_at) <= nowMs &&
      input.heartbeat.last_health_probe_status === RUNTIME_HEALTH_PROBE_STATUS.FAILED;
  }
}
