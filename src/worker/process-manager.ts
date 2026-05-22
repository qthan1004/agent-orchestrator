import { spawn as spawnProcess } from 'child_process';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { RECOVERY_DEFAULTS, SYSTEM_MESSAGE } from '../constants.js';
import { deriveNextHealthCheckDelayMs } from '../utils/lifecycle-timing.js';

const DEFAULT_WORKER_MAX_RUNTIME_MS = 5 * 60 * 1000;
const FORCE_KILL_GRACE_MS = 3_000;

function getDefaultHarnessEntrypoint(): string {
  return path.join(process.cwd(), 'dist', 'harness', 'index.js');
}

export interface WorkerPayload {
  worker_id: string;
  task_id?: string;
  [key: string]: any;
}

export interface WorkerProcessInfo {
  pid: number;
  worker_id: string;
  task_id?: string;
  started_at: string;
  process: ChildProcess;
  timeoutTimer?: NodeJS.Timeout;
  healthCheckTimer?: NodeJS.Timeout;
  completion: Promise<WorkerProcessOutcome>;
}

export interface SpawnOptions {
  timeoutMs?: number;
  scriptPath?: string;
}

export interface WorkerProcessManagerOptions {
  staleWorkerThresholdMs?: number;
}

export type WorkerProcessExit = {
  type: 'exit';
  code: number | null;
  signal: NodeJS.Signals | null;
};

export type WorkerProcessTimeout = {
  type: 'timeout';
};

export type WorkerProcessOutcome = WorkerProcessExit | WorkerProcessTimeout;

export interface SpawnedWorker {
  pid: number;
  worker_id: string;
  completion: Promise<WorkerProcessOutcome>;
}

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
    const timeoutMs = options.timeoutMs || DEFAULT_WORKER_MAX_RUNTIME_MS;

    const child = spawnProcess(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (child.pid === undefined) {
      throw new Error('Failed to spawn child process');
    }

    const pid = child.pid;
    const worker_id = payload.worker_id;
    const task_id = payload.task_id;
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
          console.log(`  │ \x1b[36m[${worker_id}]\x1b[0m ${line}`);
        }
      }
    });

    child.stderr?.on('data', (data) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.error(`  │ \x1b[33m[${worker_id}]\x1b[0m ${line}`);
        }
      }
    });

    let healthCheckTimer: NodeJS.Timeout | undefined;
    let lastHealthCheckAt = Date.now();

    const runHealthCheck = () => {
      lastHealthCheckAt = Date.now();
      const elapsedMs = lastHealthCheckAt - Date.parse(startedAt);
      const elapsedSeconds = Math.round(elapsedMs / 1000);
      this.emit('worker:heartbeat', { pid, worker_id, task_id, elapsed_ms: elapsedMs });
      console.log(`  │ \x1b[90m[${worker_id}] still running ${elapsedSeconds}s — task: ${task_id || 'none'}\x1b[0m`);
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
      console.log(`  └─ \x1b[90m[${worker_id}] Worker exited (${exitInfo}) — PID ${pid}\x1b[0m`);
      this.emit('worker:exit', { pid, worker_id, task_id, code, signal });
      settleCompletion({ type: 'exit', code, signal });
    });

    child.on('error', (err) => {
      console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
    });

    console.log(`  ┌─ \x1b[32m[${worker_id}] Worker spawned\x1b[0m — PID ${pid} — task: ${task_id || 'none'}`);
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
      }, FORCE_KILL_GRACE_MS);
      nuclearKillTimer.unref();

      child.once('exit', () => {
        clearTimeout(nuclearKillTimer);
      });
      
    }, FORCE_KILL_GRACE_MS);

    // Ensure we don't hold the event loop open for the fallback kill
    forceKillTimer.unref();

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
    });
  }
}
