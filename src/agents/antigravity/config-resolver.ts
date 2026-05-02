import * as path from 'path';
import * as os from 'os';

/**
 * Resolves the Antigravity data directory based on the current platform.
 */
export function resolveAgDataDir(): string {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), '.gemini', 'antigravity');
  }
  return path.join(os.homedir(), '.gemini', 'antigravity');
}

/**
 * Resolves the brain directory where Antigravity stores conversation state.
 */
export function resolveBrainDir(): string {
  return path.join(resolveAgDataDir(), 'brain');
}

/**
 * Resolves the conversations directory where Antigravity stores .pb files.
 */
export function resolveConversationsDir(): string {
  return path.join(resolveAgDataDir(), 'conversations');
}
