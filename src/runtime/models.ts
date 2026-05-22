import type { ChildProcess } from 'child_process';
import type {
  RUNTIME_BACKEND,
  RUNTIME_HEARTBEAT_STATUS,
  RUNTIME_ISOLATION,
  RUNTIME_LEASE_STATUS,
} from './constants.js';

export type RuntimeBackendKind = (typeof RUNTIME_BACKEND)[keyof typeof RUNTIME_BACKEND];
export type RuntimeIsolationKind = (typeof RUNTIME_ISOLATION)[keyof typeof RUNTIME_ISOLATION];
export type RuntimeLeaseStatus = (typeof RUNTIME_LEASE_STATUS)[keyof typeof RUNTIME_LEASE_STATUS];
export type RuntimeHeartbeatStatus = (typeof RUNTIME_HEARTBEAT_STATUS)[keyof typeof RUNTIME_HEARTBEAT_STATUS];

export interface RuntimeIdentity {
  runtime_id: string;
  worker_id: string;
  task_id: string;
  lease_generation: number;
}

export interface RuntimeBackendProfile {
  backend: RuntimeBackendKind;
  model?: string;
  endpoint_url?: string;
  command?: string;
}

export interface RuntimeIsolationProfile {
  mode: RuntimeIsolationKind;
  workspace_root: string;
  runtime_root?: string;
}

export interface RuntimeLease extends RuntimeIdentity {
  status: RuntimeLeaseStatus;
  backend: RuntimeBackendProfile;
  isolation: RuntimeIsolationProfile;
  reserved_points: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  released_at?: string;
}

export interface RuntimeHeartbeat extends RuntimeIdentity {
  status: RuntimeHeartbeatStatus;
  last_seen_at: string;
  stale_at: string;
  last_health_check_at: string;
  next_health_check_at: string;
}

export interface RuntimeBackendSession extends RuntimeIdentity {
  backend: RuntimeBackendKind;
  pid?: number;
  endpoint_url?: string;
  model?: string;
  started_at: string;
}

export interface RuntimeProcessPayload {
  worker_id: string;
  task_id?: string;
  runtime_identity?: RuntimeIdentity;
  [key: string]: unknown;
}

export type RuntimeProcessExit = {
  type: 'exit';
  code: number | null;
  signal: NodeJS.Signals | null;
};

export type RuntimeProcessTimeout = {
  type: 'timeout';
};

export type RuntimeProcessOutcome = RuntimeProcessExit | RuntimeProcessTimeout;

export interface RuntimeProcessInfo {
  pid: number;
  worker_id: string;
  task_id?: string;
  started_at: string;
  process: ChildProcess;
  timeoutTimer?: NodeJS.Timeout;
  healthCheckTimer?: NodeJS.Timeout;
  completion: Promise<RuntimeProcessOutcome>;
}

export interface RuntimeSpawnOptions {
  timeoutMs?: number;
  scriptPath?: string;
}

export interface RuntimeProcessManagerOptions {
  staleWorkerThresholdMs?: number;
}

export interface SpawnedRuntimeProcess {
  pid: number;
  worker_id: string;
  completion: Promise<RuntimeProcessOutcome>;
}
