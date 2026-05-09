import readline from 'readline/promises';
import type { ConfigOverrides } from '../models/index.js';
import { SYSTEM_MESSAGE } from '../constants.js';

const DEFAULTS = {
  port: 3847,
  staleSeconds: 30,
  pollTimeoutSec: 30,
  planWatcherSec: 30
};

export async function promptConfig(): Promise<ConfigOverrides> {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });

  console.log(SYSTEM_MESSAGE.SETUP_BANNER);
  console.log('────────────────────────\n');

  const profile = (await rl.question('? Server profile (default/hybrid) [default]: ')).trim().toLowerCase() || 'default';
  if (profile !== 'default' && profile !== 'hybrid') {
    console.log(SYSTEM_MESSAGE.SETUP_INVALID_PROFILE);
  }
  const validProfile = (profile === 'hybrid' ? 'hybrid' : 'default') as 'default' | 'hybrid';

  const mode = (await rl.question('? Configuration (default/custom) [default]: ')).trim().toLowerCase() || 'default';

  let config: {
    workspaceRoot?: string;
    port?: number;
    staleWorkerSeconds?: number;
    pollTimeoutSec?: number;
    planWatcherSec?: number;
    [key: string]: any;
  } = {};

  if (mode === 'custom') {
    const workspaceRoot = (await rl.question(`  ? Workspace root (project path for agents) [current dir]: `)) || process.cwd();
    const port = parseInt((await rl.question(`  ? Server port [${DEFAULTS.port}]: `)) || DEFAULTS.port.toString());
    
    const staleWorkerSecondsStr = await rl.question(`  ? Worker stale threshold (sec) [use profile default]: `);
    const staleWorkerSeconds = staleWorkerSecondsStr.trim() ? parseInt(staleWorkerSecondsStr) : undefined;
    
    const pollTimeoutSec = parseInt((await rl.question(`  ? Long poll timeout (sec) [${DEFAULTS.pollTimeoutSec}]: `)) || DEFAULTS.pollTimeoutSec.toString());
    const planWatcherSec = parseInt((await rl.question(`  ? Plan watcher (sec) [${DEFAULTS.planWatcherSec}]: `)) || DEFAULTS.planWatcherSec.toString());
    
    config = { workspaceRoot, port, staleWorkerSeconds, pollTimeoutSec, planWatcherSec };
    
    console.log(SYSTEM_MESSAGE.SETUP_CUSTOM_APPLIED);
  } else {
    // Default mode → show values, ask confirm
    console.log('  Current defaults:');
    console.log(`    Workspace root:    ${process.cwd()}`);
    console.log(`    Port:              ${DEFAULTS.port}`);
    console.log(`    Stale threshold:   Profile-based (${validProfile})`);
    console.log(`    Long poll timeout: ${DEFAULTS.pollTimeoutSec} seconds`);
    console.log(`    Plan watcher:      ${DEFAULTS.planWatcherSec} seconds\n`);

    const confirm = ((await rl.question('  ? Apply defaults? (Y/n): ')).trim().toLowerCase()) || 'y';
    
    if (confirm === 'n') {
      rl.close();
      return promptConfig(); // Recursion → back to choice
    }
    
    config = { ...DEFAULTS, workspaceRoot: process.cwd() };
    console.log(SYSTEM_MESSAGE.SETUP_DEFAULTS_APPLIED);
  }

  rl.close();

  // Convert to runtime values
  return {
    profile: validProfile,
    workspaceRoot: config.workspaceRoot,
    port: config.port,
    host: '127.0.0.1',
    staleWorkerThresholdMs: (config.staleWorkerSeconds ? config.staleWorkerSeconds * 1_000 : undefined),
    pollTimeoutMs: (config.pollTimeoutSec || DEFAULTS.pollTimeoutSec) * 1_000,
    planWatcherIntervalMs: (config.planWatcherSec || DEFAULTS.planWatcherSec) * 1_000
  };
}
