export const BRAIN_WATCHER_CONFIG = {
  POLL_INTERVAL_MS: 10_000,      // 10s
  IDLE_THRESHOLD_MS: 60_000,     // 1 min
  STUCK_THRESHOLD_MS: 180_000,   // 3 min
} as const;

export type SessionStatus = 'ACTIVE' | 'IDLE' | 'STUCK';
