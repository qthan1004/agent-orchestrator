import { EventEmitter } from 'node:events';
import { TASK_STATUS, type TaskStatusValue } from '../constants.js';
import type { TaskMetadata } from '../models/index.js';
import type { SchedulerQueueStatus } from '../scheduler/index.js';
import type { TaskDef, TaskGraph, TaskGroup } from '../task/index.js';

export type TaskQueueStatus = SchedulerQueueStatus;

export type QueueTask = TaskDef | TaskMetadata;

export interface SerializedTaskQueue {
  graph: TaskGraph;
  tasks: Record<string, QueueTask>;
}

function getDependencies(task: QueueTask): string[] {
  if (Array.isArray((task as TaskMetadata).depends_on)) {
    return (task as TaskMetadata).depends_on;
  }
  if (Array.isArray(task.dependencies)) {
    return task.dependencies as string[];
  }
  return [];
}

function getTargetFiles(task: QueueTask): string[] {
  return Array.isArray((task as TaskMetadata).target_files)
    ? (task as TaskMetadata).target_files
    : [];
}

function getPriority(task: QueueTask): number {
  return typeof (task as TaskMetadata).priority === 'number'
    ? (task as TaskMetadata).priority
    : 0;
}

function getCreatedAt(task: QueueTask): string {
  return typeof (task as TaskMetadata).created_at === 'string'
    ? (task as TaskMetadata).created_at
    : '';
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.?\//, '');
}

export class TaskQueue extends EventEmitter {
  tasks: Map<string, QueueTask>;
  groups: TaskGroup[];

  constructor() {
    super();
    this.tasks = new Map();
    this.groups = [];
  }

  validateDAG(graph: TaskGraph | null | undefined): void {
    if (!graph || !graph.groups) return;

    const dependencyGraph = new Map<TaskGroup['group_id'], NonNullable<TaskGroup['depends_on']>>();
    for (const group of graph.groups) {
      dependencyGraph.set(group.group_id, group.depends_on || []);
    }

    const visitedGroups = new Set<TaskGroup['group_id']>();
    const groupsInCurrentPath = new Set<TaskGroup['group_id']>();

    const checkCycle = (groupId: TaskGroup['group_id']): boolean => {
      if (!visitedGroups.has(groupId)) {
        visitedGroups.add(groupId);
        groupsInCurrentPath.add(groupId);

        const dependentGroups = dependencyGraph.get(groupId) || [];
        for (const depGroupId of dependentGroups) {
          if (!visitedGroups.has(depGroupId) && checkCycle(depGroupId)) {
            return true;
          } else if (groupsInCurrentPath.has(depGroupId)) {
            return true;
          }
        }
      }
      groupsInCurrentPath.delete(groupId);
      return false;
    };

    for (const groupId of dependencyGraph.keys()) {
      if (!visitedGroups.has(groupId) && checkCycle(groupId)) {
        throw new Error('Circular dependency detected in task graph');
      }
    }
  }

  loadFromGraph(tasks: TaskDef[], graph: TaskGraph): void {
    const newGroups = graph?.groups || [];
    this.groups.push(...newGroups);

    for (const task of tasks) {
      this.tasks.set(task.id, {
        ...task,
        status: TASK_STATUS.PENDING
      });
    }

    this.emit('task-available');
  }

  registerTaskMetadata(task: TaskMetadata): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} is already registered.`);
    }

    this.tasks.set(task.id, { ...task, status: TASK_STATUS.PENDING });
    this.groups.push({
      group_id: task.task_id,
      tasks: [task.id],
      depends_on: [...task.depends_on],
    });
    this.emit('task-available');
  }

  loadFromState(tasksMap: Map<string, QueueTask>, graph: TaskGraph): void {
    this.groups = (graph?.groups || []).sort((a, b) => String(a.group_id).localeCompare(String(b.group_id)));
    this.tasks = tasksMap;
  }

  getUnlockedTasks(): QueueTask[] {
    const unlocked: QueueTask[] = [];

    for (const group of this.groups) {
      const deps = group.depends_on || [];
      const depsMet = deps.every(depGroupId => {
        const depGroup = this.groups.find(g => g.group_id === depGroupId);
        if (!depGroup) {
          const depTask = this.tasks.get(String(depGroupId));
          return depTask ? depTask.status === TASK_STATUS.DONE : true;
        }
        return depGroup.tasks.every(taskId => {
          const t = this.tasks.get(taskId);
          return t && t.status === TASK_STATUS.DONE;
        });
      });

      if (!depsMet) continue;

      for (const taskId of group.tasks) {
        const task = this.tasks.get(taskId);
        if (task && task.status === TASK_STATUS.PENDING) {
          unlocked.push(task);
        }
      }
    }

    return unlocked;
  }

  getActiveTasks(): QueueTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === TASK_STATUS.ACTIVE);
  }

  canDispatch(task: QueueTask, activeTasks: QueueTask[] = this.getActiveTasks()): boolean {
    const dependencies = getDependencies(task);
    const allDepsResolved = dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask?.status === TASK_STATUS.DONE;
    });

    if (!allDepsResolved) return false;

    const taskFiles = getTargetFiles(task).map(normalizePath);
    if (taskFiles.length === 0) return true;

    const activeFiles = new Set(
      activeTasks.flatMap(activeTask => getTargetFiles(activeTask).map(normalizePath))
    );

    return !taskFiles.some(file => activeFiles.has(file));
  }

  getDispatchableTasks(): QueueTask[] {
    return this.getUnlockedTasks()
      .filter(task => this.canDispatch(task))
      .sort((a, b) => {
        const priorityDiff = getPriority(a) - getPriority(b);
        if (priorityDiff !== 0) return priorityDiff;

        const fileCountDiff = getTargetFiles(a).length - getTargetFiles(b).length;
        if (fileCountDiff !== 0) return fileCountDiff;

        return getCreatedAt(a).localeCompare(getCreatedAt(b));
      });
  }

  getNextTask(): QueueTask | null {
    const dispatchableTasks = this.getDispatchableTasks();
    return dispatchableTasks[0] || null;
  }

  updateTaskStatus(taskId: string, status: TaskStatusValue, extra?: Partial<TaskMetadata>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const updatedTask: QueueTask = { ...task, status };
    if (status === TASK_STATUS.ACTIVE && 'started_at' in updatedTask) {
      (updatedTask as TaskMetadata).started_at = new Date().toISOString();
    }
    if (
      (status === TASK_STATUS.DONE || status === TASK_STATUS.FAILED || status === TASK_STATUS.BLOCKED) &&
      'completed_at' in updatedTask
    ) {
      (updatedTask as TaskMetadata).completed_at = new Date().toISOString();
    }
    if (extra) {
      Object.assign(updatedTask, extra);
    }

    this.tasks.set(taskId, updatedTask);
    return true;
  }

  requeueTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      const updatedTask: QueueTask = { ...task, status: TASK_STATUS.PENDING };
      if ('blocked_reason' in updatedTask) {
        delete (updatedTask as Partial<TaskMetadata>).blocked_reason;
      }
      this.tasks.set(taskId, updatedTask);
      this.emit('task-available');
    }
  }

  pruneCompletedGroups(): number {
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

  getStatus(): TaskQueueStatus {
    const counts = { total: 0, pending: 0, active: 0, done: 0, failed: 0, blocked: 0 };

    for (const task of this.tasks.values()) {
      counts.total++;
      if (task.status && counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    }

    return counts;
  }

  serialize(): SerializedTaskQueue {
    return {
      graph: { groups: this.groups },
      tasks: Object.fromEntries(this.tasks)
    };
  }
}
