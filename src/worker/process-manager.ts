import { spawn as spawnProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { RECOVERY_DEFAULTS, SYSTEM_MESSAGE } from '../constants.js';
import type {
  RuntimeProcessInfo,
  RuntimeProcessManagerOptions,
  RuntimeProcessOutcome,
  RuntimeProcessPayload,
  RuntimeSpawnOptions,
  SpawnedRuntimeProcess,
} from '../runtime/models.js';
import { RUNTIME_PROCESS_TEXT, RUNTIME_TIMING_DEFAULTS } from '../runtime/constants.js';
import { deriveNextHealthCheckDelayMs } from '../utils/lifecycle-timing.js';

function getDefaultHarnessEntrypoint(): string {
  return path.join(process.cwd(), 'dist', 'harness', 'index.js');
}

function shouldUseVisibleHarnessTerminal(options: SpawnOptions, managerDefault?: boolean): boolean {
  if (typeof options.visibleTerminal === 'boolean') return options.visibleTerminal;
  if (typeof managerDefault === 'boolean') return managerDefault;
  const raw = process.env.ORCHESTRATOR_HARNESS_TERMINAL;
  if (raw === '0' || raw?.toLowerCase() === 'false') return false;
  if (raw === '1' || raw?.toLowerCase() === 'true') return true;
  return process.platform === 'win32';
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
}

function psSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function payloadWorkspaceRoot(payload: WorkerPayload): string {
  return typeof payload.workspace_root === 'string' && payload.workspace_root.trim()
    ? payload.workspace_root
    : process.cwd();
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
  private visibleHarnessTerminal?: boolean;

  constructor(options: WorkerProcessManagerOptions = {}) {
    super();
    this.activeWorkers = new Map();
    this.staleWorkerThresholdMs = options.staleWorkerThresholdMs ?? RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS;
    this.visibleHarnessTerminal = options.visibleHarnessTerminal;
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

    if (process.platform === 'win32' && shouldUseVisibleHarnessTerminal(options, this.visibleHarnessTerminal)) {
      return this.spawnVisibleTerminal(payload, scriptPath, timeoutMs);
    }

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
    const taskIdForLog = task_id || RUNTIME_PROCESS_TEXT.NO_TASK;
    const runtimePrefix = runtime_identity
      ? RUNTIME_PROCESS_TEXT.RUNTIME_PREFIX(worker_id, taskIdForLog, runtime_identity.runtime_id, runtime_identity.lease_generation)
      : `[${worker_id}]`;

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
          console.log(runtime_identity
            ? RUNTIME_PROCESS_TEXT.STDOUT_RUNTIME_LINE(runtimePrefix, line)
            : RUNTIME_PROCESS_TEXT.STDOUT_LINE(worker_id, line));
        }
      }
    });

    child.stderr?.on('data', (data) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.error(runtime_identity
            ? RUNTIME_PROCESS_TEXT.STDERR_RUNTIME_LINE(runtimePrefix, line)
            : RUNTIME_PROCESS_TEXT.STDERR_LINE(worker_id, line));
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
      console.log(runtime_identity
        ? RUNTIME_PROCESS_TEXT.STILL_RUNNING_RUNTIME(runtimePrefix, elapsedSeconds)
        : RUNTIME_PROCESS_TEXT.STILL_RUNNING(worker_id, elapsedSeconds, task_id || RUNTIME_PROCESS_TEXT.NO_TASK));
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
      runtime_identity,
      model: typeof payload.model === 'string' ? payload.model : undefined,
      backend: payload.backend && typeof payload.backend === 'object' && !Array.isArray(payload.backend)
        ? (payload.backend as { backend?: any }).backend
        : undefined,
      visible_terminal: false,
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
      console.log(runtime_identity
        ? RUNTIME_PROCESS_TEXT.EXITED_RUNTIME(runtimePrefix, exitInfo, pid)
        : RUNTIME_PROCESS_TEXT.EXITED(worker_id, exitInfo, pid));
      this.emit('worker:exit', { pid, worker_id, task_id, code, signal });
      settleCompletion({ type: 'exit', code, signal });
    });

    child.on('error', (err) => {
      console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
    });

    console.log(runtime_identity
      ? RUNTIME_PROCESS_TEXT.SPAWNED_RUNTIME(runtimePrefix, pid)
      : RUNTIME_PROCESS_TEXT.SPAWNED(worker_id, pid, task_id || RUNTIME_PROCESS_TEXT.NO_TASK));
    // Send payload after lifecycle listeners are attached.
    if (child.stdin) {
      child.stdin.write(JSON.stringify(payload) + '\n');
      child.stdin.end();
    }

    return { pid, worker_id, completion };
  }

  private spawnVisibleTerminal(payload: WorkerPayload, scriptPath: string, timeoutMs: number): SpawnedWorker {
    const worker_id = payload.worker_id;
    const task_id = payload.task_id;
    const runtime_identity = payload.runtime_identity;
    const taskIdForLog = task_id || RUNTIME_PROCESS_TEXT.NO_TASK;
    const runtimePrefix = runtime_identity
      ? RUNTIME_PROCESS_TEXT.RUNTIME_PREFIX(worker_id, taskIdForLog, runtime_identity.runtime_id, runtime_identity.lease_generation)
      : `[${worker_id}]`;
    const startedAt = new Date().toISOString();
    const terminalRoot = path.join(
      payloadWorkspaceRoot(payload),
      '.orchestrator',
      'exchange',
      'harness-terminals',
      safeFileName(runtime_identity?.runtime_id || `${worker_id}-${taskIdForLog}`)
    );
    fs.mkdirSync(terminalRoot, { recursive: true });

    const payloadFile = path.join(terminalRoot, 'payload.json');
    const statusFile = path.join(terminalRoot, 'status.json');
    const runnerFile = path.join(terminalRoot, 'run-harness.ps1');
    fs.writeFileSync(payloadFile, JSON.stringify(payload, null, 2), 'utf-8');
    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
    } catch {}

    const title = `AO ${worker_id} ${taskIdForLog}`;
    const runnerScript = [
      '$ErrorActionPreference = "Continue"',
      `$Host.UI.RawUI.WindowTitle = ${psSingleQuote(title)}`,
      '$env:ORCHESTRATOR_HARNESS_TERMINAL_CHILD = "1"',
      `Write-Host ${psSingleQuote(`[HarnessTerminal] ${runtimePrefix}`)}`,
      `Write-Host ${psSingleQuote(`[HarnessTerminal] payload=${payloadFile}`)}`,
      '$exitCode = 1',
      'try {',
      `  Get-Content -Raw -LiteralPath ${psSingleQuote(payloadFile)} | & ${psSingleQuote(process.execPath)} ${psSingleQuote(scriptPath)}`,
      '  if ($null -ne $LASTEXITCODE) { $exitCode = [int]$LASTEXITCODE } else { $exitCode = 0 }',
      '} catch {',
      '  Write-Error $_',
      '  $exitCode = 1',
      '}',
      '$status = @{ type = "exit"; code = $exitCode; signal = $null; at = (Get-Date).ToString("o") } | ConvertTo-Json -Compress',
      `Set-Content -LiteralPath ${psSingleQuote(statusFile)} -Value $status -Encoding UTF8`,
      `Write-Host ${psSingleQuote('[HarnessTerminal] status written')}`,
      'Write-Host "[HarnessTerminal] exited code=$exitCode"',
      'if ($env:ORCHESTRATOR_HARNESS_TERMINAL_KEEP_OPEN -ne "0") {',
      '  Write-Host "Press Enter to close this harness terminal."',
      '  [void][Console]::ReadLine()',
      '}',
      'exit $exitCode',
      '',
    ].join('\r\n');
    fs.writeFileSync(runnerFile, runnerScript, 'utf-8');

    const child = spawnProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', runnerFile], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });

    if (child.pid === undefined) {
      throw new Error(RUNTIME_PROCESS_TEXT.SPAWN_FAILED);
    }

    const pid = child.pid;
    child.unref();

    let completionSettled = false;
    let settleCompletion: (result: WorkerProcessOutcome) => void = () => {};
    const completion = new Promise<WorkerProcessOutcome>((resolve) => {
      settleCompletion = (result) => {
        if (completionSettled) return;
        completionSettled = true;
        resolve(result);
      };
    });

    let healthCheckTimer: NodeJS.Timeout | undefined;
    let statusPollTimer: NodeJS.Timeout | undefined;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let lastHealthCheckAt = Date.now();

    const cleanupTrackedWorker = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (healthCheckTimer) clearTimeout(healthCheckTimer);
      if (statusPollTimer) clearTimeout(statusPollTimer);
      this.activeWorkers.delete(pid);
    };

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
      console.log(runtime_identity
        ? RUNTIME_PROCESS_TEXT.STILL_RUNNING_RUNTIME(runtimePrefix, elapsedSeconds)
        : RUNTIME_PROCESS_TEXT.STILL_RUNNING(worker_id, elapsedSeconds, task_id || RUNTIME_PROCESS_TEXT.NO_TASK));
      scheduleHealthCheck();
    };

    const scheduleHealthCheck = () => {
      const delayMs = deriveNextHealthCheckDelayMs(this.staleWorkerThresholdMs, lastHealthCheckAt);
      healthCheckTimer = setTimeout(runHealthCheck, delayMs);
      healthCheckTimer.unref();
      const activeInfo = this.activeWorkers.get(pid);
      if (activeInfo) activeInfo.healthCheckTimer = healthCheckTimer;
    };

    const pollStatus = () => {
      if (!fs.existsSync(statusFile)) {
        statusPollTimer = setTimeout(pollStatus, 500);
        statusPollTimer.unref();
        return;
      }

      try {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8')) as { code?: number; signal?: NodeJS.Signals | null };
        const code = typeof status.code === 'number' ? status.code : 1;
        cleanupTrackedWorker();
        console.log(runtime_identity
          ? RUNTIME_PROCESS_TEXT.EXITED_RUNTIME(runtimePrefix, `code=${code}`, pid)
          : RUNTIME_PROCESS_TEXT.EXITED(worker_id, `code=${code}`, pid));
        this.emit('worker:exit', { pid, worker_id, task_id, code, signal: status.signal ?? null });
        settleCompletion({ type: 'exit', code, signal: status.signal ?? null });
      } catch (err: any) {
        cleanupTrackedWorker();
        console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
        settleCompletion({ type: 'exit', code: 1, signal: null });
      }
    };

    scheduleHealthCheck();
    statusPollTimer = setTimeout(pollStatus, 500);
    statusPollTimer.unref();

    timeoutTimer = setTimeout(() => {
      this.emit('worker:timeout', { pid, worker_id, task_id });
      settleCompletion({ type: 'timeout' });
      this.kill(pid);
      cleanupTrackedWorker();
    }, timeoutMs);
    timeoutTimer.unref();

    const info: WorkerProcessInfo = {
      pid,
      worker_id,
      task_id,
      started_at: startedAt,
      process: child,
      runtime_identity,
      model: typeof payload.model === 'string' ? payload.model : undefined,
      backend: payload.backend && typeof payload.backend === 'object' && !Array.isArray(payload.backend)
        ? (payload.backend as { backend?: any }).backend
        : undefined,
      visible_terminal: true,
      timeoutTimer,
      healthCheckTimer,
      completion
    };

    this.activeWorkers.set(pid, info);

    child.on('exit', (code, signal) => {
      if (completionSettled) return;
      cleanupTrackedWorker();
      const exitInfo = signal ? `signal=${signal}` : `code=${code}`;
      console.log(runtime_identity
        ? RUNTIME_PROCESS_TEXT.EXITED_RUNTIME(runtimePrefix, exitInfo, pid)
        : RUNTIME_PROCESS_TEXT.EXITED(worker_id, exitInfo, pid));
      this.emit('worker:exit', { pid, worker_id, task_id, code, signal });
      settleCompletion({ type: 'exit', code, signal });
    });

    child.on('error', (err) => {
      console.error(SYSTEM_MESSAGE.PROCESS_ERROR(worker_id, pid), err.message);
    });

    console.log(runtime_identity
      ? RUNTIME_PROCESS_TEXT.SPAWNED_VISIBLE_RUNTIME(runtimePrefix, pid, runnerFile)
      : RUNTIME_PROCESS_TEXT.SPAWNED_VISIBLE(worker_id, pid, task_id || RUNTIME_PROCESS_TEXT.NO_TASK, runnerFile));

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
      started_at: info.started_at,
      runtime_identity: info.runtime_identity,
      model: info.model,
      backend: info.backend,
      visible_terminal: info.visible_terminal,
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
