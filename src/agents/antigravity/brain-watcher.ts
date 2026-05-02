import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveBrainDir, resolveConversationsDir } from './config-resolver.js';
import { BRAIN_WATCHER_CONFIG, type SessionStatus } from './constants.js';
import { notifyStuck } from './notifications.js';

interface SessionState {
  lastSize: number;
  lastChangeAt: Date;
  status: SessionStatus;
}

const states = new Map<string, SessionState>();

function handleStuck(uuid: string, brainDir: string, idleTimeMs: number) {
  const sessionDir = path.join(brainDir, uuid);
  if (!fs.existsSync(sessionDir)) {
    try {
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch (e) {
      console.error(`[${uuid}] Failed to create session directory:`, e);
      return;
    }
  }

  const signalPath = path.join(sessionDir, '.stuck-signal.json');
  try {
    fs.writeFileSync(signalPath, JSON.stringify({
      stuckAt: new Date().toISOString(),
      uuid
    }, null, 2));
    console.log(`[${uuid}] Wrote stuck signal to ${signalPath}`);
    notifyStuck(uuid, idleTimeMs);
  } catch (error) {
    console.error(`[${uuid}] Failed to write stuck signal:`, error);
  }
}

export function scanConversations() {
  const conversationsDir = resolveConversationsDir();
  const brainDir = resolveBrainDir();

  if (!fs.existsSync(conversationsDir)) {
    console.log(`Conversations directory not found: ${conversationsDir}`);
    return;
  }

  const now = new Date();
  
  try {
    const files = fs.readdirSync(conversationsDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.pb')) {
        const uuid = file.name.replace('.pb', '');
        const pbFilePath = path.join(conversationsDir, file.name);

        try {
          const stats = fs.statSync(pbFilePath);
          const currentSize = stats.size;
          let state = states.get(uuid);

          if (!state) {
            state = {
              lastSize: currentSize,
              lastChangeAt: now,
              status: 'ACTIVE'
            };
            states.set(uuid, state);
            console.log(`[${uuid}] Tracking started - ACTIVE (Size: ${currentSize})`);
          } else {
            if (currentSize !== state.lastSize) {
              state.lastSize = currentSize;
              state.lastChangeAt = now;
              if (state.status !== 'ACTIVE') {
                state.status = 'ACTIVE';
                console.log(`[${uuid}] State changed to ACTIVE`);
              }
            } else {
              const idleTimeMs = now.getTime() - state.lastChangeAt.getTime();

              if (idleTimeMs >= BRAIN_WATCHER_CONFIG.STUCK_THRESHOLD_MS && state.status !== 'STUCK') {
                state.status = 'STUCK';
                console.log(`[${uuid}] State changed to STUCK`);
                handleStuck(uuid, brainDir, idleTimeMs);
              } else if (idleTimeMs >= BRAIN_WATCHER_CONFIG.IDLE_THRESHOLD_MS && idleTimeMs < BRAIN_WATCHER_CONFIG.STUCK_THRESHOLD_MS && state.status !== 'IDLE') {
                state.status = 'IDLE';
                console.log(`[${uuid}] State changed to IDLE`);
              }
            }
          }
        } catch (fileErr) {
          // File might have been deleted mid-scan
        }
      }
    }
  } catch (dirErr) {
    console.error('Failed to read conversations directory:', dirErr);
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startBrainWatcher() {
  console.log('====================================');
  console.log('🧠 Antigravity Brain Watcher Started');
  console.log(`   Poll interval:  ${BRAIN_WATCHER_CONFIG.POLL_INTERVAL_MS}ms`);
  console.log(`   Idle threshold: ${BRAIN_WATCHER_CONFIG.IDLE_THRESHOLD_MS}ms`);
  console.log(`   Stuck threshold:${BRAIN_WATCHER_CONFIG.STUCK_THRESHOLD_MS}ms`);
  console.log(`   Conversations:  ${resolveConversationsDir()}`);
  console.log(`   Brain Dir:      ${resolveBrainDir()}`);
  console.log('====================================');
  
  scanConversations(); // Initial scan
  
  intervalId = setInterval(scanConversations, BRAIN_WATCHER_CONFIG.POLL_INTERVAL_MS);
}

export function stopBrainWatcher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🧠 Antigravity Brain Watcher Stopped');
  }
}

// Run as standalone process if executed directly
if (process.argv[1]?.endsWith('brain-watcher.ts') || process.argv[1]?.endsWith('brain-watcher.js')) {
  startBrainWatcher();

  const handleSignal = (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down brain watcher...`);
    stopBrainWatcher();
    process.exit(0);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
}
