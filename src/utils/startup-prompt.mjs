import readline from 'readline/promises';

const DEFAULTS = {
  port: 3847,
  staleMinutes: 30,
  pollTimeoutSec: 30,
  planWatcherSec: 30
};

export async function promptConfig() {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });

  console.log('\n🚀 MCP Orchestrator Setup');
  console.log('────────────────────────\n');

  const mode = (await rl.question('? Configuration (default/custom) [default]: ')).trim().toLowerCase() || 'default';

  let config;

  if (mode === 'custom') {
    const port = parseInt((await rl.question(`  ? Server port [${DEFAULTS.port}]: `)) || DEFAULTS.port);
    const staleMinutes = parseInt((await rl.question(`  ? Stale threshold (min) [${DEFAULTS.staleMinutes}]: `)) || DEFAULTS.staleMinutes);
    const pollTimeoutSec = parseInt((await rl.question(`  ? Long poll timeout (sec) [${DEFAULTS.pollTimeoutSec}]: `)) || DEFAULTS.pollTimeoutSec);
    const planWatcherSec = parseInt((await rl.question(`  ? Plan watcher (sec) [${DEFAULTS.planWatcherSec}]: `)) || DEFAULTS.planWatcherSec);
    
    config = { port, staleMinutes, pollTimeoutSec, planWatcherSec };
    
    console.log('\n  ✅ Custom config applied (session-only)\n');
  } else {
    // Default mode → show values, ask confirm
    console.log('  Current defaults:');
    console.log(`    Port:              ${DEFAULTS.port}`);
    console.log(`    Stale threshold:   ${DEFAULTS.staleMinutes} minutes`);
    console.log(`    Long poll timeout: ${DEFAULTS.pollTimeoutSec} seconds`);
    console.log(`    Plan watcher:      ${DEFAULTS.planWatcherSec} seconds\n`);

    const confirm = ((await rl.question('  ? Apply defaults? (Y/n): ')).trim().toLowerCase()) || 'y';
    
    if (confirm === 'n') {
      rl.close();
      return promptConfig(); // Recursion → back to choice
    }
    
    config = { ...DEFAULTS };
    console.log('\n  ✅ Defaults applied\n');
  }

  rl.close();

  // Convert to runtime values
  return {
    port: config.port,
    host: '127.0.0.1',
    staleThresholdMs: config.staleMinutes * 60_000,
    pollTimeoutMs: config.pollTimeoutSec * 1_000,
    planWatcherIntervalMs: config.planWatcherSec * 1_000
  };
}
