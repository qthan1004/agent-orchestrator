import readline from 'readline/promises';
import type { ConfigOverrides } from '../models/index.js';
import { SYSTEM_MESSAGE } from '../constants.js';

const DEFAULTS = {
  port: 3847,
  planWatcherSec: 30
};

/**
 * Prompt user for configuration at startup.
 * workspace_path is mandatory — no implicit workspace inference.
 */
export async function promptConfig(): Promise<ConfigOverrides> {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });

  console.log(SYSTEM_MESSAGE.SETUP_BANNER);
  console.log('────────────────────────\n');

  const mode = (await rl.question('? Configuration (default/custom) [default]: ')).trim().toLowerCase() || 'default';

  let config: {
    workspaceRoot?: string;
    port?: number;
    planWatcherSec?: number;
    [key: string]: any;
  } = {};

  if (mode === 'custom') {
    const workspaceRoot = (await rl.question(`  ? Workspace root (REQUIRED — absolute path): `)).trim();
    if (!workspaceRoot) {
      console.error('\n  ✗ Workspace root is required. No implicit workspace discovery allowed.');
      console.error('    Provide an explicit absolute path to the target project workspace.\n');
      rl.close();
      process.exit(1);
    }

    const port = parseInt((await rl.question(`  ? Server port [${DEFAULTS.port}]: `)) || DEFAULTS.port.toString());
    const planWatcherSec = parseInt((await rl.question(`  ? Plan watcher (sec) [${DEFAULTS.planWatcherSec}]: `)) || DEFAULTS.planWatcherSec.toString());
    
    config = { workspaceRoot, port, planWatcherSec };
    
    console.log(SYSTEM_MESSAGE.SETUP_CUSTOM_APPLIED);
  } else {
    // Default mode: workspace root MUST still be explicitly confirmed
    const cwd = process.cwd();
    console.log('  Current defaults:');
    console.log(`    Workspace root:    ${cwd}`);
    console.log(`    Port:              ${DEFAULTS.port}`);
    console.log(`    Profile:           hybrid`);
    console.log(`    Plan watcher:      ${DEFAULTS.planWatcherSec} seconds\n`);

    const confirm = ((await rl.question('  ? Apply defaults? (Y/n): ')).trim().toLowerCase()) || 'y';
    
    if (confirm === 'n') {
      rl.close();
      return promptConfig();
    }
    
    config = { ...DEFAULTS, workspaceRoot: cwd };
    console.log(SYSTEM_MESSAGE.SETUP_DEFAULTS_APPLIED);
  }

  rl.close();

  // Final guard: workspaceRoot must be non-empty
  if (!config.workspaceRoot) {
    console.error('\n  ✗ Workspace root is required. Cannot start without an explicit workspace path.\n');
    process.exit(1);
  }

  return {
    profile: 'hybrid',
    workspaceRoot: config.workspaceRoot,
    port: config.port,
    host: '127.0.0.1',
    planWatcherIntervalMs: (config.planWatcherSec || DEFAULTS.planWatcherSec) * 1_000
  };
}
