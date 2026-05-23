import {
  RUNTIME_LEASE_STATUS,
  RUNTIME_TERMINAL_CALLBACK_STATUS,
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
      status: RUNTIME_LEASE_STATUS.STARTING,
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
      this.isOpenStatus(lease.status)
    ) ?? null;
  }

  getActiveLeases(): RuntimeLease[] {
    return Array.from(this.leases.values()).filter(lease => this.isOpenStatus(lease.status));
  }

  markStatus(runtimeId: string, status: RuntimeLeaseStatus): RuntimeLease | null {
    const lease = this.leases.get(runtimeId);
    if (!lease) return null;
    const now = new Date().toISOString();
    const updated: RuntimeLease = {
      ...lease,
      status,
      updated_at: now,
      ready_at: status === RUNTIME_LEASE_STATUS.READY ? now : lease.ready_at,
      running_at: status === RUNTIME_LEASE_STATUS.RUNNING ? now : lease.running_at,
    };
    this.leases.set(runtimeId, updated);
    return updated;
  }

  acceptTerminalCallback(runtimeId: string, status: RuntimeLease['terminal_callback_status']): RuntimeLease | null {
    const lease = this.leases.get(runtimeId);
    if (!lease || lease.terminal_callback_accepted_at) return null;
    const now = new Date().toISOString();
    const leaseStatus = status === RUNTIME_TERMINAL_CALLBACK_STATUS.HANDOVER_REQUIRED
      ? RUNTIME_LEASE_STATUS.HANDOVER_REQUIRED
      : RUNTIME_LEASE_STATUS.COMPLETING;
    const updated: RuntimeLease = {
      ...lease,
      status: leaseStatus,
      terminal_callback_status: status,
      terminal_callback_accepted_at: now,
      updated_at: now,
    };
    this.leases.set(runtimeId, updated);
    return updated;
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

  private isOpenStatus(status: RuntimeLeaseStatus): boolean {
    return status !== RUNTIME_LEASE_STATUS.RELEASED &&
      status !== RUNTIME_LEASE_STATUS.FAILED &&
      status !== RUNTIME_LEASE_STATUS.CLOSED;
  }
}
