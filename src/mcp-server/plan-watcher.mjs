import { STATE_EVENTS } from '../constants.mjs';

/**
 * PlanWatcher — Auto-polls plan/pending/ directory on a configurable interval.
 * When a new plan is detected, it moves the plan to processing/ and logs the event.
 * 
 * This replaces the need for agents to manually call check_plans.
 */
export class PlanWatcher {
  /**
   * @param {object} params
   * @param {import('./state-manager.mjs').StateManager} params.stateManager
   * @param {import('../utils/logger.mjs').Logger} params.logger
   * @param {number} [params.intervalMs=30000] - Polling interval (default 30s)
   */
  constructor({ stateManager, logger, intervalMs = 30_000 }) {
    this.stateManager = stateManager;
    this.logger = logger;
    this.intervalMs = intervalMs;

    this._timer = null;
    this._running = false;

    // Stats
    this._stats = {
      totalPolls: 0,
      plansDetected: 0,
      lastPollAt: null,
      lastPlanDetected: null,
      startedAt: null,
    };
  }

  /**
   * Start auto-polling loop.
   */
  start() {
    if (this._timer) return; // already running

    this._running = true;
    this._stats.startedAt = new Date().toISOString();

    // Run immediately on start, then on interval
    this._poll();

    this._timer = setInterval(() => {
      this._poll();
    }, this.intervalMs);

    // Don't prevent Node.js from exiting
    this._timer.unref();

    this.logger.log('PLAN_WATCHER_STARTED', {
      interval_ms: this.intervalMs,
      message: `Plan watcher started (polling every ${this.intervalMs / 1000}s)`
    });

    console.log(`  🔍 Plan watcher: polling every ${this.intervalMs / 1000}s`);
  }

  /**
   * Stop the auto-polling loop.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._running = false;

      this.logger.log('PLAN_WATCHER_STOPPED', {
        stats: this._stats,
        message: 'Plan watcher stopped'
      });
    }
  }

  /**
   * Single poll iteration — check for pending plans and process them.
   */
  _poll() {
    this._stats.totalPolls++;
    this._stats.lastPollAt = new Date().toISOString();

    try {
      const result = this.stateManager.checkPlans();

      if (result.status === 'ready') {
        // New plan detected and moved to processing!
        this._stats.plansDetected++;
        this._stats.lastPlanDetected = {
          filename: result.current,
          detectedAt: new Date().toISOString(),
        };

        this.logger.log(STATE_EVENTS.PLAN_DETECTED, {
          filename: result.current,
          plan_path: result.plan_path,
          pending_remaining: result.pending_count,
          message: `📋 Auto-detected new plan: ${result.current}`
        });

        console.log(`  📋 Plan detected: ${result.current} → moved to processing/`);
        if (result.pending_count > 0) {
          console.log(`     ${result.pending_count} more plan(s) still pending`);
        }

      } else if (result.status === 'busy') {
        // Already processing a plan — skip silently (no spam)
        // Only log at debug level periodically
      }
      // 'idle' — nothing pending, nothing to do

    } catch (err) {
      console.error(`  ⚠ Plan watcher error: ${err.message}`);
      this.logger.log('PLAN_WATCHER_ERROR', {
        error: err.message,
        message: `Plan watcher poll failed: ${err.message}`
      });
    }
  }

  /**
   * Get watcher stats for health endpoint.
   */
  getStats() {
    return {
      running: this._running,
      interval_ms: this.intervalMs,
      ...this._stats,
    };
  }
}
