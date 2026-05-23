import { spawn } from 'child_process';
import { RUNTIME_BACKEND } from '../../runtime/constants.js';
import { CODEX_CLI_RUNTIME_DEFAULTS, CODEX_CLI_RUNTIME_LOG } from './constants.js';
import type { CodexCliRuntimeSession, CodexCliStartInput } from './models.js';

export class CodexCliRuntime {
  private readonly sessions = new Map<string, CodexCliRuntimeSession>();

  start(input: CodexCliStartInput): CodexCliRuntimeSession {
    const command = input.command ?? CODEX_CLI_RUNTIME_DEFAULTS.COMMAND;
    const args = input.args ?? [];
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (child.pid === undefined) {
      throw new Error('Failed to spawn Codex CLI runtime.');
    }

    child.stdout?.on('data', data => {
      for (const line of data.toString().trim().split('\n').filter(Boolean)) {
        console.log(CODEX_CLI_RUNTIME_LOG.STDOUT(input.identity.runtime_id, line));
      }
    });
    child.stderr?.on('data', data => {
      for (const line of data.toString().trim().split('\n').filter(Boolean)) {
        console.warn(CODEX_CLI_RUNTIME_LOG.STDERR(input.identity.runtime_id, line));
      }
    });

    const session: CodexCliRuntimeSession = {
      ...input.identity,
      backend: RUNTIME_BACKEND.CODEX_CLI,
      command,
      args,
      process: child,
      pid: child.pid,
      started_at: new Date().toISOString(),
    };
    this.sessions.set(input.identity.runtime_id, session);
    child.once('exit', () => this.sessions.delete(input.identity.runtime_id));
    return session;
  }

  kill(runtimeId: string): void {
    const session = this.sessions.get(runtimeId);
    if (!session) return;
    session.process.kill('SIGTERM');
    this.sessions.delete(runtimeId);
  }

  isAlive(runtimeId: string): boolean {
    return this.sessions.has(runtimeId);
  }
}
