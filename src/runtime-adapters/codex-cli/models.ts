import type { ChildProcess } from 'child_process';
import type { RuntimeBackendSession, RuntimeIdentity } from '../../runtime/models.js';

export interface CodexCliRuntimeSession extends RuntimeBackendSession {
  command: string;
  args: string[];
  process: ChildProcess;
}

export interface CodexCliStartInput {
  identity: RuntimeIdentity;
  command?: string;
  args?: string[];
}
