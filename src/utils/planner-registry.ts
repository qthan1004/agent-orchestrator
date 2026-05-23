import crypto from 'crypto';
import path from 'path';
import type { PlannerInfo, PlannerWorkflowPaths } from '../models/index.js';
import { ensureDir, readJSON, writeJSON } from './file-backend.js';

export const generatePlannerId = (): string => `p-${crypto.randomBytes(4).toString('hex')}`;

export class PlannerRegistry {
  private planners = new Map<string, PlannerInfo>();
  private registryFilePath: string | null;

  constructor(registryFilePath?: string) {
    this.registryFilePath = registryFilePath || null;
    if (this.registryFilePath) {
      this.load();
    }
  }

  setRegistryPath(filePath: string): void {
    this.registryFilePath = filePath;
    this.planners.clear();
    this.load();
  }

  register(workspaceId: string, workflowPaths: PlannerWorkflowPaths): PlannerInfo {
    const id = generatePlannerId();
    const now = new Date().toISOString();
    const planner: PlannerInfo = {
      id,
      workspace_id: workspaceId,
      role: 'planner',
      registered_at: now,
      last_heartbeat: now,
      status: 'active',
      workflow_paths: workflowPaths,
      plans_created: 0,
      tasks_created: 0,
    };
    this.planners.set(id, planner);
    this.save();
    return planner;
  }

  getPlanner(id: string): PlannerInfo | undefined {
    return this.planners.get(id);
  }

  getAll(): PlannerInfo[] {
    return Array.from(this.planners.values());
  }

  updateHeartbeat(id: string): boolean {
    const planner = this.planners.get(id);
    if (!planner) return false;
    planner.last_heartbeat = new Date().toISOString();
    if (planner.status === 'disconnected') {
      planner.status = 'active';
      delete planner.disconnected_at;
    }
    this.save();
    return true;
  }

  recordPlanCreated(id: string, planFile: string): void {
    const planner = this.planners.get(id);
    if (!planner) return;
    planner.plans_created += 1;
    planner.last_plan_file = planFile;
    planner.last_heartbeat = new Date().toISOString();
    this.save();
  }

  recordTasksCreated(id: string, taskCount: number, planFile: string): void {
    const planner = this.planners.get(id);
    if (!planner) return;
    planner.tasks_created += taskCount;
    planner.last_plan_file = planFile;
    planner.last_heartbeat = new Date().toISOString();
    this.save();
  }

  recordTaskReady(id: string): void {
    const planner = this.planners.get(id);
    if (!planner) return;
    const now = new Date().toISOString();
    planner.last_ready_at = now;
    planner.last_heartbeat = now;
    this.save();
  }

  private load(): void {
    if (!this.registryFilePath) return;
    const data = readJSON<PlannerInfo[]>(this.registryFilePath);
    if (!Array.isArray(data)) return;
    for (const raw of data) {
      this.planners.set(raw.id, raw);
    }
  }

  private save(): void {
    if (!this.registryFilePath) return;
    ensureDir(path.dirname(this.registryFilePath));
    writeJSON(this.registryFilePath, Array.from(this.planners.values()));
  }
}

export const plannerRegistry = new PlannerRegistry();
