import type { InfraCapacityRequest, VerifiedInfraCapacity } from '../infra/index.js';
import type { CapacityStore } from '../infra/index.js';
import type { RuntimeIdentity, RuntimeLease } from './models.js';

export interface PointReservation {
  runtime_id: string;
  lease_generation: number;
  task_id: string;
  worker_id: string;
  points_reserved: number;
  capacity_checked_at: string | null;
  created_at: string;
}

export class PointAllocator {
  private readonly reservations = new Map<string, PointReservation>();

  constructor(private readonly capacityStore: CapacityStore) {}

  reserve(lease: RuntimeLease, request: InfraCapacityRequest): PointReservation {
    const capacity = this.capacityStore.getVerifiedCapacity();
    this.assertCapacityAllowsReservation(capacity, request);

    const reservation: PointReservation = {
      runtime_id: lease.runtime_id,
      lease_generation: lease.lease_generation,
      task_id: lease.task_id,
      worker_id: lease.worker_id,
      points_reserved: lease.reserved_points,
      capacity_checked_at: capacity?.checked_at ?? null,
      created_at: new Date().toISOString(),
    };
    this.reservations.set(lease.runtime_id, reservation);
    return reservation;
  }

  release(identity: RuntimeIdentity): void {
    this.reservations.delete(identity.runtime_id);
  }

  get(runtimeId: string): PointReservation | null {
    return this.reservations.get(runtimeId) ?? null;
  }

  getActiveReservations(): PointReservation[] {
    return Array.from(this.reservations.values());
  }

  private assertCapacityAllowsReservation(capacity: VerifiedInfraCapacity | null, request: InfraCapacityRequest): void {
    if (!capacity) return;

    if (request.worker_slots > capacity.max_local_runtimes) {
      throw new Error(`Requested worker slots ${request.worker_slots} exceeds verified capacity ${capacity.max_local_runtimes}.`);
    }
    if (
      typeof request.estimated_vram_mb === 'number' &&
      typeof capacity.available_vram_mb === 'number' &&
      request.estimated_vram_mb > capacity.available_vram_mb
    ) {
      throw new Error(`Requested VRAM ${request.estimated_vram_mb}MB exceeds verified available VRAM ${capacity.available_vram_mb}MB.`);
    }
  }
}
