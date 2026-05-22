import { spawn } from 'child_process';
import { RUNTIME_BACKEND } from '../../runtime/constants.js';
import { AG_CLI_RUNTIME_DEFAULTS } from './constants.js';
import type { AgCliRuntimeSession, AgCliStartInput } from './models.js';

export class AgCliRuntime {
  private readonly sessions = new Map<string, AgCliRuntimeSession>();

  start(input: AgCliStartInput): AgCliRuntimeSession {
    const command = input.command ?? AG_CLI_RUNTIME_DEFAULTS.COMMAND;
    const args = input.args ?? [];
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (child.pid === undefined) {
      throw new Error('Failed to spawn AG CLI runtime.');
    }

    const session: AgCliRuntimeSession = {
      ...input.identity,
      backend: RUNTIME_BACKEND.AG_CLI,
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
