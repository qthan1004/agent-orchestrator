import path from 'path';
import fs from 'fs';
import {
  RECOVERY_EVENTS,
  RECOVERY_DEFAULTS,
  SHUTDOWN_MARKER_FILE,
  TASK_STATUS,
  FILE_PREFIXES
} from '../constants.mjs';
import { listFiles, readJSON } from '../utils/file-backend.mjs';

/**
 * RecoveryManager — handles crash recovery, stale worker detection,
 * and orphan task requeuing for the MCP Orchestrator.
 */
export class RecoveryManager {
  /**
   * @param {object} params
   * @param {import('./state-manager.mjs').StateManager} params.stateManager
   * @param {import('../utils/worker-registry.mjs').WorkerRegistry} params.workerRegistry
   * @param {import('../utils/logger.mjs').Logger} params.logger
   * @param {object} params.config - loadConfig() result
   * @param {object} [params.recoveryConfig] - optional overrides
   */
  constructor({ stateManager, workerRegistry, logger, config, recoveryConfig = {} }) {
    this.stateManager = stateManager;
    this.workerRegistry = workerRegistry;
    this.logger = logger;
    this.config = config;

    this.monitorIntervalMs = recoveryConfig.monitorIntervalMs ?? RECOVERY_DEFAULTS.MONITOR_INTERVAL_MS;
    this.staleThresholdMs = recoveryConfig.staleThresholdMs ?? RECOVERY_DEFAULTS.STALE_THRESHOLD_MS;
    this.maxRetries = recoveryConfig.maxRetries ?? RECOVERY_DEFAULTS.MAX_RETRIES;
    this.maxTaskRetries = config.recovery?.maxTaskRetries ?? RECOVERY_DEFAULTS.MAX_TASK_RETRIES;

    this._monitorTimer = null;
  }

  // ─── Shutdown Marker ────────────────────────────────────────

  /** Path to the clean-shutdown marker file. */
  get _markerPath() {
    return path.join(this.config.exchange.base, SHUTDOWN_MARKER_FILE);
  }

  /** Write marker indicating a clean shutdown. */
  markCleanShutdown() {
    try {
      fs.writeFileSync(this._markerPath, new Date().toISOString(), 'utf8');
      this.logger.log(RECOVERY_EVENTS.CLEAN_SHUTDOWN_MARKED, {
        message: 'Clean shutdown marker written'
      });
    } catch (err) {
      console.error('Failed to write shutdown marker:', err.message);
    }
  }

  /** Check whether the last shutdown was clean. */
  wasCleanShutdown() {
    return fs.existsSync(this._markerPath);
  }

  /** Remove the shutdown marker (called after recovery). */
  clearShutdownMarker() {
    try {
      if (fs.existsSync(this._markerPath)) {
        fs.unlinkSync(this._markerPath);
      }
    } catch (err) {
      console.error('Failed to clear shutdown marker:', err.message);
    }
  }

  // ─── Orphan Detection (post-crash) ─────────────────────────

  /**
   * Scan active/ directory for tasks that have no matching active worker.
   * Returns an array of orphan task IDs.
   */
  detectOrphans() {
    const activeDir = this.config.exchange.active;
    const taskFiles = listFiles(activeDir, '.json')
      .filter(f => f.startsWith(FILE_PREFIXES.TASK));

    // Build a set of task IDs that workers currently own
    const workerOwnedTasks = new Set();
    for (const worker of this.workerRegistry.getAllWorkers()) {
      if (worker.current_task) {
        workerOwnedTasks.add(worker.current_task);
      }
    }

    const orphans = [];
    for (const file of taskFiles) {
      const data = readJSON(path.join(activeDir, file));
      if (data && data.id && !workerOwnedTasks.has(data.id)) {
        orphans.push(data.id);
        this.logger.log(RECOVERY_EVENTS.ORPHAN_DETECTED, {
          task_id: data.id,
          message: `Orphan task found in active/ with no owning worker`
        });
      }
    }

    return orphans;
  }

  /**
   * Requeue all orphan tasks from active/ back to inbox/.
   * Uses disk-based retry counting (unified with stateManager).
   */
  requeueOrphans() {
    const orphans = this.detectOrphans();

    for (const taskId of orphans) {
      const retryCount = this.stateManager.getTaskRetryCount(taskId);

      if (retryCount >= this.maxRetries) {
        this.logger.log(RECOVERY_EVENTS.MAX_RETRIES_EXCEEDED, {
          task_id: taskId,
          retries: retryCount,
          message: `Orphan task reached max retries (${this.maxRetries}), still requeuing (orphan != broken)`
        });
      }

      // ALWAYS requeue orphans — use requeueWithRetry to track count on disk
      const newRetryCount = this.stateManager.requeueWithRetry(taskId);

      this.logger.log(RECOVERY_EVENTS.ORPHAN_REQUEUED, {
        task_id: taskId,
        retry: newRetryCount,
        message: `Orphan task requeued to inbox (attempt ${newRetryCount})`
      });
    }

    return orphans;
  }

  // ─── Stale Worker Detection (runtime) ──────────────────────

  /**
   * Identify workers whose last heartbeat exceeds the stale threshold.
   */
  checkStaleWorkers() {
    const now = Date.now();
    const staleWorkers = [];

    for (const worker of this.workerRegistry.getAllWorkers()) {
      if (!worker.current_task) continue; // only check busy workers

      const lastBeat = new Date(worker.last_heartbeat).getTime();
      const elapsed = now - lastBeat;

      if (elapsed > this.staleThresholdMs) {
        staleWorkers.push(worker);

        this.logger.log(RECOVERY_EVENTS.STALE_WORKER_DETECTED, {
          worker_id: worker.id,
          task_id: worker.current_task,
          elapsed_ms: elapsed,
          threshold_ms: this.staleThresholdMs,
          message: `Worker ${worker.id} stale for ${Math.round(elapsed / 1000)}s`
        });

        this._handleStaleTask(worker);
      }
    }

    return staleWorkers;
  }

  /**
   * Safety net: scan outbox/ for FAILED tasks that shouldn't be there.
   * Only requeues tasks with retry_count < maxTaskRetries.
   * Permanently failed tasks (retry_count >= max) are left in outbox.
   * Guards against double-move race with complete_task.
   */
  _requeueFailedFromOutbox() {
    const outboxDir = this.config.exchange.outbox;
    const taskFiles = listFiles(outboxDir, '.json')
      .filter(f => f.startsWith(FILE_PREFIXES.TASK));

    let requeuedCount = 0;

    for (const file of taskFiles) {
      const fullPath = path.join(outboxDir, file);

      // Guard: re-check file still exists (race with complete_task or other recovery)
      if (!fs.existsSync(fullPath)) continue;

      const data = readJSON(fullPath);
      if (!data || data.status !== TASK_STATUS.FAILED) continue;

      // Don't requeue permanently failed tasks
      const retryCount = data.retry_count || 0;
      if (retryCount >= this.maxTaskRetries) continue;

      this.logger.log(RECOVERY_EVENTS.ORPHAN_REQUEUED, {
        task_id: data.id,
        retry_count: retryCount,
        message: `Safety net: FAILED task found in outbox (retry ${retryCount}/${this.maxTaskRetries}), requeuing to inbox`
      });

      // Move to inbox without incrementing retry count (already counted when failed)
      this.stateManager.moveToInbox(data.id);
      requeuedCount++;
    }

    return requeuedCount;
  }

  /**
   * Handle a stale worker's task — requeue back to inbox if task is still in active/.
   * 
   * RACE CONDITION GUARD: If complete_task already moved the file out of active/,
   * we skip the requeue and only mark the worker as disconnected.
   * 
   * @param {object} worker - stale worker info
   */
  _handleStaleTask(worker) {
    const taskId = worker.current_task;
    if (!taskId) return;

    // ─── Race condition guard ───
    // Check if task file is STILL in active/ before requeuing.
    // If complete_task already processed it, the file is gone → skip requeue.
    if (!this.stateManager.isTaskInActive(taskId)) {
      this.logger.log(RECOVERY_EVENTS.STALE_WORKER_DETECTED, {
        worker_id: worker.id,
        task_id: taskId,
        message: `Task ${taskId} already moved from active/ (race with complete_task), skipping requeue`
      });

      // Still mark worker as disconnected
      this.workerRegistry.markDisconnected(worker.id);
      return;
    }

    // Task still in active/ → requeue with retry tracking (disk-based)
    const newRetryCount = this.stateManager.requeueWithRetry(taskId);

    this.logger.log(RECOVERY_EVENTS.ORPHAN_REQUEUED, {
      task_id: taskId,
      worker_id: worker.id,
      retry: newRetryCount,
      message: `Stale task requeued to inbox (attempt ${newRetryCount})`
    });

    // Mark worker as disconnected (keeps entry for late complete_task)
    this.workerRegistry.markDisconnected(worker.id);
  }

  // ─── Monitoring Lifecycle ──────────────────────────────────

  /** Start the periodic stale-worker monitoring interval. */
  startMonitoring() {
    if (this._monitorTimer) return; // already running

    this._monitorTimer = setInterval(() => {
      this.checkStaleWorkers();
      this._requeueFailedFromOutbox();
    }, this.monitorIntervalMs);

    // Don't prevent Node.js from exiting
    this._monitorTimer.unref();

    this.logger.log(RECOVERY_EVENTS.MONITORING_STARTED, {
      interval_ms: this.monitorIntervalMs,
      stale_threshold_ms: this.staleThresholdMs,
      message: `Recovery monitoring started (every ${this.monitorIntervalMs / 1000}s)`
    });
  }

  /** Stop the monitoring interval. */
  stopMonitoring() {
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer);
      this._monitorTimer = null;

      this.logger.log(RECOVERY_EVENTS.MONITORING_STOPPED, {
        message: 'Recovery monitoring stopped'
      });
    }
  }

  // ─── Startup Recovery Flow ─────────────────────────────────

  /**
   * Full startup recovery sequence:
   * 1. Check if last shutdown was clean
   * 2. If unclean → detect and requeue orphans
   * 3. Restore state from files
   * 4. Start monitoring
   * 5. Clear shutdown marker
   */
  runStartupRecovery() {
    this.logger.log(RECOVERY_EVENTS.RECOVERY_STARTED, {
      message: 'Running startup recovery sequence'
    });

    const wasClean = this.wasCleanShutdown();
    let orphanCount = 0;

    if (!wasClean) {
      this.logger.log(RECOVERY_EVENTS.UNCLEAN_SHUTDOWN_DETECTED, {
        message: 'Previous shutdown was NOT clean — scanning for orphans'
      });

      // Restore state first so queue knows about tasks
      this.stateManager.restoreFromFiles();

      // Then detect and requeue orphans
      const orphans = this.requeueOrphans();
      orphanCount = orphans.length;
    } else {
      // Clean shutdown — just restore normally
      this.stateManager.restoreFromFiles();
    }

    // Start monitoring
    this.startMonitoring();

    // Clear the marker (will be re-written on next clean shutdown)
    this.clearShutdownMarker();

    this.logger.log(RECOVERY_EVENTS.RECOVERY_COMPLETED, {
      was_clean: wasClean,
      orphans_found: orphanCount,
      message: `Startup recovery complete (clean=${wasClean}, orphans=${orphanCount})`
    });

    return { wasClean, orphanCount };
  }

  // ─── Graceful Shutdown Flow ────────────────────────────────

  /**
   * Full graceful shutdown sequence:
   * 1. Stop monitoring
   * 2. Save checkpoint
   * 3. Write shutdown marker
   * 4. Log shutdown event
   */
  runGracefulShutdown() {
    this.stopMonitoring();
    this.stateManager.saveCheckpoint();
    this.markCleanShutdown();

    this.logger.log(RECOVERY_EVENTS.SERVER_SHUTDOWN, {
      message: 'Graceful shutdown completed'
    });
  }
}
