import type { ChildProcess } from 'child_process';
import type { RuntimeBackendSession, RuntimeIdentity } from '../../runtime/models.js';

export interface AgCliRuntimeSession extends RuntimeBackendSession {
  command: string;
  args: string[];
  process: ChildProcess;
}

export interface AgCliStartInput {
  identity: RuntimeIdentity;
  command?: string;
  args?: string[];
}
