import {
  RUNTIME_LEASE_STATUS,
} from './constants.js';
import type {
  RuntimeBackendProfile,
  RuntimeIdentity,
  RuntimeIsolationProfile,
  RuntimeLease,
  RuntimeLeaseStatus,
} from './models.js';

export interface CreateRuntimeLeaseInput {
  identity: RuntimeIdentity;
  backend: RuntimeBackendProfile;
  isolation: RuntimeIsolationProfile;
  reserved_points: number;
  expires_at?: string;
}

export class RuntimeRegistry {
  private readonly leases = new Map<string, RuntimeLease>();

  createLease(input: CreateRuntimeLeaseInput): RuntimeLease {
    const existing = this.getActiveLeaseForTaskAttempt(input.identity.task_id, input.identity.lease_generation);
    if (existing) {
      throw new Error(`Runtime lease already active for task ${input.identity.task_id} generation ${input.identity.lease_generation}.`);
    }

    const now = new Date().toISOString();
    const lease: RuntimeLease = {
      ...input.identity,
      status: RUNTIME_LEASE_STATUS.ACTIVE,
      backend: input.backend,
      isolation: input.isolation,
      reserved_points: input.reserved_points,
      created_at: now,
      updated_at: now,
      expires_at: input.expires_at,
    };

    this.leases.set(lease.runtime_id, lease);
    return lease;
  }

  get(runtimeId: string): RuntimeLease | null {
    return this.leases.get(runtimeId) ?? null;
  }

  getActiveLeaseForTaskAttempt(taskId: string, leaseGeneration: number): RuntimeLease | null {
    return Array.from(this.leases.values()).find(lease =>
      lease.task_id === taskId &&
      lease.lease_generation === leaseGeneration &&
      lease.status === RUNTIME_LEASE_STATUS.ACTIVE
    ) ?? null;
  }

  getActiveLeases(): RuntimeLease[] {
    return Array.from(this.leases.values()).filter(lease => lease.status === RUNTIME_LEASE_STATUS.ACTIVE);
  }

  release(runtimeId: string, status: RuntimeLeaseStatus = RUNTIME_LEASE_STATUS.RELEASED): RuntimeLease | null {
    const lease = this.leases.get(runtimeId);
    if (!lease) return null;

    const updated: RuntimeLease = {
      ...lease,
      status,
      updated_at: new Date().toISOString(),
      released_at: new Date().toISOString(),
    };
    this.leases.set(runtimeId, updated);
    return updated;
  }
}
