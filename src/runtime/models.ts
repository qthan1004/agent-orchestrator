import type { ChildProcess } from 'child_process';
import type {
  RUNTIME_BACKEND,
  RUNTIME_HEARTBEAT_STATUS,
  RUNTIME_HEALTH_PROBE_STATUS,
  RUNTIME_ISOLATION,
  RUNTIME_LEASE_STATUS,
  RUNTIME_READY_STEP,
  RUNTIME_SERVICE_STATUS,
  RUNTIME_TERMINAL_CALLBACK_STATUS,
} from './constants.js';

export type RuntimeBackendKind = (typeof RUNTIME_BACKEND)[keyof typeof RUNTIME_BACKEND];
export type RuntimeIsolationKind = (typeof RUNTIME_ISOLATION)[keyof typeof RUNTIME_ISOLATION];
export type RuntimeLeaseStatus = (typeof RUNTIME_LEASE_STATUS)[keyof typeof RUNTIME_LEASE_STATUS];
export type RuntimeHeartbeatStatus = (typeof RUNTIME_HEARTBEAT_STATUS)[keyof typeof RUNTIME_HEARTBEAT_STATUS];
export type RuntimeHealthProbeStatus = (typeof RUNTIME_HEALTH_PROBE_STATUS)[keyof typeof RUNTIME_HEALTH_PROBE_STATUS];
export type RuntimeServiceStatus = (typeof RUNTIME_SERVICE_STATUS)[keyof typeof RUNTIME_SERVICE_STATUS];
export type RuntimeReadyStep = (typeof RUNTIME_READY_STEP)[keyof typeof RUNTIME_READY_STEP];
export type RuntimeTerminalCallbackStatus = (typeof RUNTIME_TERMINAL_CALLBACK_STATUS)[keyof typeof RUNTIME_TERMINAL_CALLBACK_STATUS];

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
  args?: string[];
  session_id?: string;
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
  ready_at?: string;
  running_at?: string;
  terminal_callback_status?: RuntimeTerminalCallbackStatus;
  terminal_callback_accepted_at?: string;
  service_handle_id?: string;
}

export interface RuntimeHeartbeat extends RuntimeIdentity {
  status: RuntimeHeartbeatStatus;
  last_seen_at: string;
  stale_at: string;
  last_health_check_at: string;
  next_health_check_at: string;
  last_health_probe_status: RuntimeHealthProbeStatus;
  last_health_probe_at?: string;
}

export interface BackendSessionIdentity extends RuntimeIdentity {
  backend: RuntimeBackendKind;
  backend_session_id: string;
  endpoint_url?: string;
  pid?: number;
  command?: string;
  model?: string;
}

export interface RuntimeBackendSession extends RuntimeIdentity {
  backend: RuntimeBackendKind;
  pid?: number;
  endpoint_url?: string;
  model?: string;
  started_at: string;
}

export interface RuntimeServiceHandle extends BackendSessionIdentity {
  status: RuntimeServiceStatus;
  started_at: string;
  updated_at: string;
  isolation: RuntimeIsolationProfile;
  metadata?: Record<string, unknown>;
}

export interface RuntimeServiceStartInput {
  identity: RuntimeIdentity;
  backend: RuntimeBackendProfile;
  isolation: RuntimeIsolationProfile;
  workspace_root: string;
  warm_cache_policy?: WarmModelCachePolicy;
}

export interface RuntimeServiceStartResult {
  handle: RuntimeServiceHandle;
  backend: RuntimeBackendProfile;
  isolation: RuntimeIsolationProfile;
  payload_patch?: Record<string, unknown>;
}

export interface RuntimeServiceCleanupInput {
  identity: RuntimeIdentity;
  terminal_status?: RuntimeTerminalCallbackStatus;
  warm_cache_policy?: WarmModelCachePolicy;
}

export interface RuntimeServiceAdapter {
  readonly backend: RuntimeBackendKind;
  start(input: RuntimeServiceStartInput): Promise<RuntimeServiceStartResult> | RuntimeServiceStartResult;
  probe(handle: RuntimeServiceHandle): Promise<boolean> | boolean;
  cleanup(input: RuntimeServiceCleanupInput, handle: RuntimeServiceHandle): Promise<void> | void;
}

export interface HarnessReadyStepResult {
  step: RuntimeReadyStep;
  ok: boolean;
  message: string;
  at: string;
}

export interface HarnessReadyEvent extends RuntimeIdentity {
  backend: RuntimeBackendKind;
  ready: boolean;
  steps: HarnessReadyStepResult[];
  failed_step?: RuntimeReadyStep;
  reason?: string;
  at: string;
}

export interface HarnessLifecycleEvent extends RuntimeIdentity {
  backend: RuntimeBackendKind;
  phase: string;
  message: string;
  at: string;
  stream?: 'stdout' | 'stderr' | 'wrapper';
  context_usage?: {
    used: number;
    limit: number;
    percent: number;
  };
}

export interface HarnessActivityDetails {
  current_tool?: string;
  current_file?: string;
  tool_call_count?: number;
  context_usage?: {
    used: number;
    limit: number;
    percent: number;
  };
}

export interface ContextSuccessionEvent extends RuntimeIdentity {
  status: typeof RUNTIME_TERMINAL_CALLBACK_STATUS.HANDOVER_REQUIRED;
  goal: string;
  progress: string;
  touched_files: string[];
  next_action: string;
  risks: string[];
  checks_run: string[];
  handover: string;
  at: string;
}

export interface WarmModelCacheKey {
  backend: RuntimeBackendKind;
  model: string;
  endpoint_url?: string;
}

export interface WarmModelCachePolicy {
  ttl_ms: number;
  retain_on_release: boolean;
  evict_on_pressure: boolean;
}

export interface WarmModelCacheEntry {
  key: WarmModelCacheKey;
  runtime_id?: string;
  loaded_at: string;
  last_used_at: string;
  expires_at: string;
  retained: boolean;
}

export interface TerminalCallbackState extends RuntimeIdentity {
  status: RuntimeTerminalCallbackStatus;
  accepted: boolean;
  accepted_at?: string;
  summary: string;
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
  runtime_identity?: RuntimeIdentity;
  model?: string;
  backend?: RuntimeBackendKind;
  visible_terminal?: boolean;
  visible_terminal_pid_file?: string;
  timeoutTimer?: NodeJS.Timeout;
  healthCheckTimer?: NodeJS.Timeout;
  completion: Promise<RuntimeProcessOutcome>;
}

export interface RuntimeSpawnOptions {
  timeoutMs?: number;
  scriptPath?: string;
  visibleTerminal?: boolean;
}

export interface RuntimeProcessManagerOptions {
  staleWorkerThresholdMs?: number;
  visibleHarnessTerminal?: boolean;
}

export interface SpawnedRuntimeProcess {
  pid: number;
  worker_id: string;
  completion: Promise<RuntimeProcessOutcome>;
}
