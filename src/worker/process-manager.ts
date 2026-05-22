import { spawn as spawnProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { RECOVERY_DEFAULTS, SYSTEM_MESSAGE } from '../constants.js';
import type {
  RuntimeProcessInfo,
  RuntimeProcessManagerOptions,
  RuntimeProcessOutcome,
  RuntimeProcessPayload,
  RuntimeSpawnOptions,
  SpawnedRuntimeProcess,
} from '../runtime/index.js';
import { RUNTIME_PROCESS_TEXT, RUNTIME_TIMING_DEFAULTS } from '../runtime/index.js';
import { deriveNextHealthCheckDelayMs } from '../utils/lifecycle-timing.js';

function getDefaultHarnessEntrypoint(): string {
  return path.join(process.cwd(), 'dist', 'harness', 'index.js');
}

export type WorkerPayload = RuntimeProcessPayload;
export type WorkerProcessInfo = RuntimeProcessInfo;
export type SpawnOptions = RuntimeSpawnOptions;
export type WorkerProcessManagerOptions = RuntimeProcessManagerOptions;
export type WorkerProcessOutcome = RuntimeProcessOutcome;
export type SpawnedWorker = SpawnedRuntimeProcess;

export class WorkerProcessManager extends EventEmitter {
  private activeWorkers: Map<number, WorkerProcessInfo>;
  private staleWorkerThresholdMs: number;

  constructor(options: WorkerProcessManagerOptions = {}) {
    super();
    this.activeWorkers = new Map();
    this.staleWorkerThresholdMs = options.staleWorkerThresholdMs ?? RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS;
  }

  /**
   * Spawn a new worker process.
   * @param payload JSON payload to send to stdin.
   * @param options Spawn options (timeoutMs, scriptPath).
   * @returns spawned worker metadata and a completion promise.
   */
  spawn(payload: WorkerPayload, options: SpawnOptions = {}): SpawnedWorker {
    const scriptPath = options.scriptPath || getDefaultHarnessEntrypoint();
    const timeoutMs = options.timeoutMs || RUNTIME_TIMING_DEFAULTS.DEFAULT_WORKER_MAX_RUNTIME_MS;

    const child = spawnProcess(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (child.pid === undefined) {
      throw new Error(RUNTIME_PROCESS_TEXT.SPAWN_FAILED);
    }

    const pid = child.pid;
    const worker_id = payload.worker_id;
    const task_id = payload.task_id;
    const runtime_identity = payload.runtime_identity;
    const startedAt = new Date().toISOString();

    let completionSettled = false;
    let settleCompletion: (result: WorkerProcessOutcome) => void = () => {};
    const completion = new Promise<WorkerProcessOutcome>((resolve) => {
      settleCompletion = (result) => {
        if (completionSettled) return;
        completionSettled = true;
        resolve(result);
      };
    });

    // ─── Forward worker output to server console (transparent execution) ───
    child.stdout?.on('data', (data) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.log(RUNTIME_PROCESS_TEXT.STDOUT_LINE(worker_id, line));
        }
      }
    });

    child.stderr?.on('data', (data) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.error(RUNTIME_PROCESS_TEXT.STDERR_LINE(worker_id, line));
        }
      }
    });

    let healthCheckTimer: NodeJS.Timeout | undefined;
    let lastHealthCheckAt = Date.now();

    const runHealthCheck = () => {
      lastHealthCheckAt = Date.now();
      const elapsedMs = lastHealthCheckAt - Date.parse(startedAt);
      const elapsedSeconds = Math.round(elapsedMs / 1000);
      this.emit('worker:heartbeat', {
        pid,
        worker_id,
        task_id,
        runtime_identity,
        elapsed_ms: elapsedMs,
        heartbeat_at: new Date(lastHealthCheckAt).toISOString(),
      });
      console.log(RUNTIME_PROCESS_TEXT.STILL_RUNNING(worker_id, elapsedSeconds, task_id || RUNTIME_PROCESS_TEXT.NO_TASK));
      scheduleHealthCheck();
    };

    const scheduleHealthCheck = () => {
      const delayMs = deriveNextHealthCheckDelayMs(this.staleWorkerThresholdMs, lastHealthCheckAt);
      healthCheckTimer = setTimeout(runHealthCheck, delayMs);
      healthCheckTimer.unref();
      const activeInfo = this.activeWorkers.get(pid);
      if (activeInfo) activeInfo.healthCheckTimer = healthCheckTimer;
    };

    scheduleHealthCheck();

    // Setup timeout auto-kill
    const timeoutTimer = setTimeout(() => {
      this.emit('worker:timeout', { pid, worker_id, task_id });
      settleCompletion({ type: 'timeout' });
      this.kill(pid);
    }, timeoutMs);

    const info: WorkerProcessInfo = {
      pid,
      worker_id,
      task_id,
      started_at: startedAt,
      process: child,
      timeoutTimer,
      healthCheckTimer,
      completion
    };

    this.activeWorkers.set(pid, info);

    child.on('exit', (code, signal) => {
      clearTimeout(timeoutTimer);
      if (healthCheckTimer) clearTimeout(healthCheckTimer);
      this.activeWorkers.delete(pid);
      const exitInfo = signal ? `signal=${signal}` : `code=${code}`;
      console.log(RUNTIME_PROCESS_TEXT.EXITED(worker_id, exitInfo, pid));
      this.emit('worker:exit', { pid, worker_id, task_id, code, signal });
      settleCompletion({ type: 'exit', code, signal });
    });

    child.on('error', (err) => {
      console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
    });

    console.log(RUNTIME_PROCESS_TEXT.SPAWNED(worker_id, pid, task_id || RUNTIME_PROCESS_TEXT.NO_TASK));
    // Send payload after lifecycle listeners are attached.
    if (child.stdin) {
      child.stdin.write(JSON.stringify(payload) + '\n');
      child.stdin.end();
    }

    return { pid, worker_id, completion };
  }

  /**
   * List active worker processes.
   */
  getActive(): Omit<WorkerProcessInfo, 'process' | 'timeoutTimer' | 'completion'>[] {
    return Array.from(this.activeWorkers.values()).map(info => ({
      pid: info.pid,
      worker_id: info.worker_id,
      task_id: info.task_id,
      started_at: info.started_at
    }));
  }

  /**
   * Gracefully or forcefully kill a worker process.
   * @param pid Process ID
   */
  kill(pid: number): void {
    const info = this.activeWorkers.get(pid);
    if (!info) return;

    if (info.timeoutTimer) {
      clearTimeout(info.timeoutTimer);
    }
    if (info.healthCheckTimer) {
      clearTimeout(info.healthCheckTimer);
    }

    const child = info.process;

    // Stage 1: SIGTERM
    child.kill('SIGTERM');

    // Stage 2: SIGKILL if still alive after 3s
    const forceKillTimer = setTimeout(() => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (err) {
        // Process might have exited already
      }
      
      // Stage 3: platform-specific nuclear kill if still alive after another 3s
      const nuclearKillTimer = setTimeout(() => {
        try {
          import('child_process').then(cp => {
            const cmd = process.platform === 'win32'
              ? `taskkill /F /PID ${pid}`
              : `kill -9 ${pid}`;
            cp.exec(cmd, () => {});
          });
        } catch (err) {
          // Ignore
        }
      }, RUNTIME_TIMING_DEFAULTS.FORCE_KILL_GRACE_MS);
      nuclearKillTimer.unref();

      child.once('exit', () => {
        clearTimeout(nuclearKillTimer);
      });
      
    }, RUNTIME_TIMING_DEFAULTS.FORCE_KILL_GRACE_MS);

    // Ensure we don't hold the event loop open for the fallback kill
    forceKillTimer.unref();

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
    });
  }
}
