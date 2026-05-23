import { STATE_EVENTS, SYSTEM_MESSAGE } from '../constants.js';
import type { Logger } from '../utils/logger.js';
import type { StateManager } from './state-manager.js';
import path from 'path';
import fs from 'fs';
import { listFiles, ensureDir, readFile, moveFile } from '../utils/file-backend.js';
import type { WorkspaceRegistry } from '../utils/workspace-registry.js';
import type { AppConfig } from '../models/index.js';

export interface PlanWatcherParams {
  stateManager: StateManager;
  logger: Logger;
  config: AppConfig;
  workspaceRegistry?: WorkspaceRegistry;
  intervalMs?: number;
}

export interface PlanWatcherStats {
  totalPolls: number;
  plansDetected: number;
  lastPollAt: string | null;
  lastPlanDetected: {
    filename: string | null;
    detectedAt: string;
  } | null;
  startedAt: string | null;
}

export interface PlanWatcherStatus extends PlanWatcherStats {
  running: boolean;
  interval_ms: number;
}

function isPendingApprovalPlan(filePath: string): boolean {
  const content = readFile(filePath);
  return Boolean(content && /^approval_status:\s*pending_user_approval\s*$/m.test(content));
}

/**
 * PlanWatcher — Auto-polls plan/pending/ directory on a configurable interval.
 * When a new plan is detected, it moves the plan to processing/ and logs the event.
 * 
 * This replaces the need for agents to manually call check_plans.
 */
export class PlanWatcher {
  stateManager: StateManager;
  logger: Logger;
  config: AppConfig;
  workspaceRegistry?: WorkspaceRegistry;
  intervalMs: number;
  private _timer: NodeJS.Timeout | null;
  private _running: boolean;
  private _stats: PlanWatcherStats;

  /**
   * @param {object} params
   * @param {import('./state-manager.js').StateManager} params.stateManager
   * @param {import('../utils/logger.js').Logger} params.logger
   * @param {number} [params.intervalMs=30000] - Polling interval (default 30s)
   */
  constructor({ stateManager, logger, config, workspaceRegistry, intervalMs = 30_000 }: PlanWatcherParams) {
    this.stateManager = stateManager;
    this.logger = logger;
    this.config = config;
    this.workspaceRegistry = workspaceRegistry;
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
  start(): void {
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

    console.log(SYSTEM_MESSAGE.PLAN_WATCHER_POLLING(this.intervalMs / 1000));
  }

  /**
   * Stop the auto-polling loop.
   */
  stop(): void {
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
  private _poll(): void {
    this._stats.totalPolls++;
    this._stats.lastPollAt = new Date().toISOString();

    try {
      const workspaces = this.workspaceRegistry ? this.workspaceRegistry.getAll() : [];
      let foundAny = false;

      // 1. Scan all registered workspaces
      for (const ws of workspaces) {
        const wsPendingDir = path.join(ws.path, '.orchestrator', 'plans', 'pending');
        if (fs.existsSync(wsPendingDir)) {
          const files = listFiles(wsPendingDir, '.md')
            .sort()
            .filter(file => !isPendingApprovalPlan(path.join(wsPendingDir, file)));
          if (files.length > 0) {
            // Pick oldest
            const nextFile = files[0];
            const src = path.join(wsPendingDir, nextFile);
            
            const wsProcessingDir = path.join(ws.path, '.orchestrator', 'plans', 'processing');
            ensureDir(wsProcessingDir);
            const dest = path.join(wsProcessingDir, nextFile);

            moveFile(src, dest);

            foundAny = true;
            this._stats.plansDetected++;
            this._stats.lastPlanDetected = {
              filename: nextFile,
              detectedAt: new Date().toISOString(),
            };

            this.logger.log(STATE_EVENTS.PLAN_DETECTED, {
              filename: nextFile,
              workspace: ws.id,
              message: `Auto-detected new plan: ${nextFile} in workspace ${ws.id}`
            });

            console.log(SYSTEM_MESSAGE.PLAN_WATCHER_DETECTED(nextFile, ws.id));
          }
        }
      }

      // 2. Backward compatibility: if no workspaces registered, fall back to stateManager checkPlans
      // Wait, checkPlans will scan the config.plans.pending (which could be the root one)
      if (workspaces.length === 0) {
        const files = listFiles(this.stateManager.config.plans.pending, '.md')
          .sort()
          .filter(file => !isPendingApprovalPlan(path.join(this.stateManager.config.plans.pending, file)));
        if (files.length === 0) return;
        const result = this.stateManager.checkPlans();

        if (result.status === 'ready') {
          foundAny = true;
          this._stats.plansDetected++;
          this._stats.lastPlanDetected = {
            filename: result.current,
            detectedAt: new Date().toISOString(),
          };

          this.logger.log(STATE_EVENTS.PLAN_DETECTED, {
            filename: result.current,
            plan_path: result.plan_path,
            pending_remaining: result.pending_count,
            message: `Auto-detected new plan: ${result.current} (Legacy mode)`
          });

          console.log(SYSTEM_MESSAGE.PLAN_WATCHER_DETECTED_LEGACY(result.current));
        }
      }

    } catch (err: any) {
      console.error(SYSTEM_MESSAGE.PLAN_WATCHER_ERROR(err.message));
      this.logger.log('PLAN_WATCHER_ERROR', {
        error: err.message,
        message: `Plan watcher poll failed: ${err.message}`
      });
    }
  }

  /**
   * Get watcher stats for health endpoint.
   */
  getStats(): PlanWatcherStatus {
    return {
      running: this._running,
      interval_ms: this.intervalMs,
      ...this._stats,
    };
  }
}
