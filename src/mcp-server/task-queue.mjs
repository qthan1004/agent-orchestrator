import { EventEmitter } from 'node:events';
import { TASK_STATUS } from '../constants.mjs';

export class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map(); // id -> task with status
    this.groups = []; // Array of { group_id, tasks: [], depends_on: [] }
  }

  /**
   * Validate DAG to ensure no circular dependencies.
   * Throws an error if a cycle is found.
   */
  validateDAG(graph) {
    if (!graph || !graph.groups) return;

    const dependencyGraph = new Map(); // group_id -> depends_on[]
    for (const group of graph.groups) {
      dependencyGraph.set(group.group_id, group.depends_on || []);
    }

    const visitedGroups = new Set();
    const groupsInCurrentPath = new Set();

    const checkCycle = (groupId) => {
      if (!visitedGroups.has(groupId)) {
        visitedGroups.add(groupId);
        groupsInCurrentPath.add(groupId);

        const dependentGroups = dependencyGraph.get(groupId) || [];
        for (const depGroupId of dependentGroups) {
          if (!visitedGroups.has(depGroupId) && checkCycle(depGroupId)) {
            return true; // Cycle detected
          } else if (groupsInCurrentPath.has(depGroupId)) {
            return true; // Cycle detected
          }
        }
      }
      groupsInCurrentPath.delete(groupId);
      return false;
    };

    for (const groupId of dependencyGraph.keys()) {
      if (!visitedGroups.has(groupId)) {
        if (checkCycle(groupId)) {
          throw new Error('Circular dependency detected in task graph');
        }
      }
    }
  }

  /**
   * Build internal queue from decomposition output.
   */
  loadFromGraph(tasks, graph) {
    if (!this.groups) this.groups = [];
    const newGroups = graph?.groups || [];
    this.groups.push(...newGroups);

    for (const task of tasks) {
      this.tasks.set(task.id, {
        ...task,
        status: TASK_STATUS.PENDING
      });
    }

    // Notify any waiting poll that tasks are available
    this.emit('task-available');
  }

  /**
   * Restore queue from in-memory state.
   * tasksMap: Map<id, task>
   */
  loadFromState(tasksMap, graph) {
    this.groups = (graph?.groups || []).sort((a, b) => String(a.group_id).localeCompare(String(b.group_id)));
    this.tasks = tasksMap;
  }

  /**
   * Return an array of tasks that can run immediately.
   */
  getUnlockedTasks() {
    const unlocked = [];

    for (const group of this.groups) {
      // Check if all dependent groups are fully DONE
      const deps = group.depends_on || [];
      const depsMet = deps.every(depGroupId => {
        const depGroup = this.groups.find(g => g.group_id === depGroupId);
        if (!depGroup) return true; // Missing group dependency treated as met? Or throw? Treat as met for now.
        return depGroup.tasks.every(taskId => {
          const t = this.tasks.get(taskId);
          return t && t.status === TASK_STATUS.DONE;
        });
      });

      if (depsMet) {
        for (const taskId of group.tasks) {
          const task = this.tasks.get(taskId);
          if (task && task.status === TASK_STATUS.PENDING) {
            unlocked.push(task);
          }
        }
      }
    }

    return unlocked;
  }

  /**
   * Get the next available task.
   */
  getNextTask() {
    const unlockedTasks = this.getUnlockedTasks();
    if (unlockedTasks.length > 0) {
      return unlockedTasks[0];
    }
    return null;
  }

  /**
   * Mark a task as completed (done, failed, etc).
   */
  updateTaskStatus(taskId, status) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;
    this.tasks.set(taskId, task); // update Map
    return true;
  }

  /**
   * Reset task status to PENDING.
   */
  requeueTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = TASK_STATUS.PENDING;
      this.emit('task-available');
    }
  }

  /**
   * Remove groups where ALL tasks are DONE or FAILED (terminated).
   * Drops them from memory to prevent DAG/queue bloat.
   */
  pruneCompletedGroups() {
    let prunedCount = 0;
    this.groups = this.groups.filter(group => {
      const allTerminated = group.tasks.every(taskId => {
        const task = this.tasks.get(taskId);
        return task && (task.status === TASK_STATUS.DONE || task.status === TASK_STATUS.FAILED);
      });
      if (allTerminated) {
        for (const taskId of group.tasks) {
          this.tasks.delete(taskId);
        }
        prunedCount++;
        return false;
      }
      return true;
    });
    return prunedCount;
  }

  /**
   * Get overall task queue status.
   */
  getStatus() {
    const counts = { total: 0, pending: 0, active: 0, done: 0, failed: 0, blocked: 0 };

    for (const task of this.tasks.values()) {
      counts.total++;
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    }

    return counts;
  }

  /**
   * Return plain object for persistence.
   */
  serialize() {
    return {
      graph: { groups: this.groups },
      tasks: Object.fromEntries(this.tasks)
    };
  }
}
