import type { RuntimeIdentity, RuntimeLease } from './models.js';

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
}
