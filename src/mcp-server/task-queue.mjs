import { TASK_STATUS } from '../constants.mjs';

export class TaskQueue {
  constructor() {
    this.tasks = new Map(); // id -> task with status
    this.groups = []; // Array of { group_id, tasks: [], depends_on: [] }
  }

  /**
   * Validate DAG to ensure no circular dependencies.
   * Throws an error if a cycle is found.
   */
  validateDAG(graph) {
    if (!graph || !graph.groups) return;

    const adj = new Map(); // group_id -> depends_on[]
    for (const group of graph.groups) {
      adj.set(group.group_id, group.depends_on || []);
    }

    const visited = new Set();
    const recStack = new Set();

    const dfs = (node) => {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);

        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && dfs(neighbor)) {
            return true; // Cycle detected
          } else if (recStack.has(neighbor)) {
            return true; // Cycle detected
          }
        }
      }
      recStack.delete(node);
      return false;
    };

    for (const group_id of adj.keys()) {
      if (!visited.has(group_id)) {
        if (dfs(group_id)) {
          throw new Error('Circular dependency detected in task graph');
        }
      }
    }
  }

  /**
   * Build internal queue from decomposition output.
   */
  loadFromGraph(tasks, graph) {
    this.groups = (graph?.groups || []).sort((a, b) => a.group_id - b.group_id);
    this.tasks.clear();

    for (const task of tasks) {
      this.tasks.set(task.id, {
        ...task,
        status: TASK_STATUS.PENDING
      });
    }
  }

  /**
   * Restore queue from in-memory state.
   * tasksMap: Map<id, task>
   */
  loadFromState(tasksMap, graph) {
    this.groups = (graph?.groups || []).sort((a, b) => a.group_id - b.group_id);
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
  completeTask(taskId, status) {
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
    }
  }

  /**
   * Get overall task queue status.
   */
  getStatus() {
    let total = 0, pending = 0, active = 0, done = 0, failed = 0, blocked = 0;

    for (const task of this.tasks.values()) {
      total++;
      if (task.status === TASK_STATUS.PENDING) pending++;
      else if (task.status === TASK_STATUS.ACTIVE) active++;
      else if (task.status === TASK_STATUS.DONE) done++;
      else if (task.status === TASK_STATUS.FAILED) failed++;
      else if (task.status === TASK_STATUS.BLOCKED) blocked++;
    }

    return { total, pending, active, done, failed, blocked };
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
