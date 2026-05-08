import type { TaskDef } from '../models/index.js';
import type { StateManager, CheckPlansResult } from './state-manager.js';
import type { TaskQueue } from './task-queue.js';

export interface PollOptions {
  timeoutMs?: number;
  checkIntervalMs?: number;
}

/**
 * Long poll: chờ task available hoặc timeout.
 * Hybrid: event-driven (instant) + interval polling (safety net).
 * Nếu pollTimeoutMs = 0 → instant mode (fallback).
 */
export function waitForTask(
  queue: TaskQueue,
  { timeoutMs = 30000, checkIntervalMs = 2000 }: PollOptions = {}
): Promise<TaskDef | null> {
  // Instant mode
  if (timeoutMs === 0) {
    return Promise.resolve(queue.getNextTask());
  }
  
  // Hybrid: event + interval poll
  return new Promise<TaskDef | null>((resolve) => {
    // Check ngay lần đầu
    const immediate = queue.getNextTask();
    if (immediate) return resolve(immediate);
    
    let resolved = false;
    
    const cleanup = () => {
      resolved = true;
      clearInterval(timer);
      clearTimeout(timeout);
      queue.removeListener('task-available', onTaskAvailable);
    };
    
    const tryResolve = () => {
      if (resolved) return;
      const task = queue.getNextTask();
      if (task) {
        cleanup();
        resolve(task);
      }
    };
    
    // Event-driven: wake instantly when task becomes available
    const onTaskAvailable = () => tryResolve();
    queue.on('task-available', onTaskAvailable);
    
    // Fallback interval polling (safety net if event missed)
    const timer = setInterval(tryResolve, checkIntervalMs);
    
    // Timeout → give up
    const timeout = setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(null);
      }
    }, timeoutMs);
  });
}

/**
 * Long poll: chờ plan available hoặc timeout.
 */
export function waitForPlan(
  stateManager: StateManager,
  { timeoutMs = 60000, checkIntervalMs = 5000 }: PollOptions = {}
): Promise<CheckPlansResult> {
  if (timeoutMs === 0) {
    return Promise.resolve(stateManager.checkPlans());
  }
  
  return new Promise<CheckPlansResult>((resolve) => {
    const immediate = stateManager.checkPlans();
    if (immediate.status !== 'idle') return resolve(immediate);
    
    const start = Date.now();
    const timer = setInterval(() => {
      const result = stateManager.checkPlans();
      if (result.status !== 'idle') {
        clearInterval(timer);
        return resolve(result);
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        return resolve(result); // still idle
      }
    }, checkIntervalMs);
  });
}
