import { spawn as spawnProcess } from 'child_process';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { SYSTEM_MESSAGE } from '../constants.js';

const DEFAULT_WORKER_TIMEOUT_MS = 5 * 60 * 1000;

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
}

export interface SpawnOptions {
  timeoutMs?: number;
  scriptPath?: string;
}

export class WorkerProcessManager extends EventEmitter {
  private activeWorkers: Map<number, WorkerProcessInfo>;

  constructor() {
    super();
    this.activeWorkers = new Map();
  }

  /**
   * Spawn a new worker process.
   * @param payload JSON payload to send to stdin.
   * @param options Spawn options (timeoutMs, scriptPath).
   * @returns { pid, worker_id }
   */
  spawn(payload: WorkerPayload, options: SpawnOptions = {}): { pid: number; worker_id: string } {
    const scriptPath = options.scriptPath || getDefaultHarnessEntrypoint();
    const timeoutMs = options.timeoutMs || DEFAULT_WORKER_TIMEOUT_MS;

    const child = spawnProcess(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (child.pid === undefined) {
      throw new Error('Failed to spawn child process');
    }

    const pid = child.pid;
    const worker_id = payload.worker_id;
    const task_id = payload.task_id;

    // Send payload to stdin
    if (child.stdin) {
      child.stdin.write(JSON.stringify(payload) + '\n');
      child.stdin.end();
    }

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

    // Setup timeout auto-kill
    const timeoutTimer = setTimeout(() => {
      this.emit('worker:timeout', { pid, worker_id, task_id });
      this.kill(pid);
    }, timeoutMs);

    const info: WorkerProcessInfo = {
      pid,
      worker_id,
      task_id,
      started_at: new Date().toISOString(),
      process: child,
      timeoutTimer
    };

    this.activeWorkers.set(pid, info);

    child.on('exit', (code, signal) => {
      clearTimeout(timeoutTimer);
      this.activeWorkers.delete(pid);
      const exitInfo = signal ? `signal=${signal}` : `code=${code}`;
      console.log(`  └─ \x1b[90m[${worker_id}] Worker exited (${exitInfo}) — PID ${pid}\x1b[0m`);
      this.emit('worker:exit', { pid, worker_id, task_id, code, signal });
    });

    child.on('error', (err) => {
      console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
    });

    console.log(`  ┌─ \x1b[32m[${worker_id}] Worker spawned\x1b[0m — PID ${pid} — task: ${task_id || 'none'}`);
    return { pid, worker_id };
  }

  /**
   * List active worker processes.
   */
  getActive(): Omit<WorkerProcessInfo, 'process' | 'timeoutTimer'>[] {
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
      }, 3000);
      nuclearKillTimer.unref();

      child.once('exit', () => {
        clearTimeout(nuclearKillTimer);
      });
      
    }, 3000);

    // Ensure we don't hold the event loop open for the fallback kill
    forceKillTimer.unref();

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
    });
  }
}
