import fs from 'fs/promises';
import path from 'path';
import type { HarnessPayload } from './payload.js';

export interface LoadedStaticFile {
  path: string;
  content: string;
}

export interface LoadedWorkspaceContext {
  taskBody: string;
  taskFilePath?: string;
  skillFiles: LoadedStaticFile[];
  contextFiles: LoadedStaticFile[];
}

export class WorkspaceLoader {
  private readonly workspaceRoot: string;
  private readonly orchestratorRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.orchestratorRoot = path.join(this.workspaceRoot, '.orchestrator');
  }

  public async load(payload: HarnessPayload): Promise<LoadedWorkspaceContext> {
    const taskBody = payload.task_file_path
      ? await this.loadTaskBody(payload.task_file_path)
      : payload.task_details || '';

    if (!taskBody.trim()) {
      throw new Error('Assigned task body is empty.');
    }

    return {
      taskBody,
      taskFilePath: payload.task_file_path,
      skillFiles: await this.loadStaticFiles(payload.skill_paths, 'skills'),
      contextFiles: await this.loadStaticFiles(payload.context_paths, 'context')
    };
  }

  private async loadTaskBody(taskFilePath: string): Promise<string> {
    const activeTaskContent = await this.readOrchestratorFile(taskFilePath, '.orchestrator task file');

    try {
      const parsed = JSON.parse(activeTaskContent) as Record<string, unknown>;
      const contentPath = typeof parsed.task_content_path === 'string' ? parsed.task_content_path : '';
      if (contentPath.trim()) {
        return await this.readOrchestratorFile(contentPath, 'task content file');
      }
    } catch {
      // Non-JSON task files are valid task bodies.
    }

    return activeTaskContent;
  }

  private async loadStaticFiles(paths: string[], kind: 'skills' | 'context'): Promise<LoadedStaticFile[]> {
    const files: LoadedStaticFile[] = [];
    for (const filePath of paths) {
      const normalized = this.normalizeStaticPath(filePath, kind);
      files.push({
        path: normalized,
        content: await this.readOrchestratorFile(normalized, `${kind} file`)
      });
    }
    return files;
  }

  private normalizeStaticPath(filePath: string, kind: 'skills' | 'context'): string {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (normalized.startsWith('.orchestrator/')) return normalized;
    if (normalized.startsWith(`${kind}/`)) return `.orchestrator/${normalized}`;
    return `.orchestrator/${kind}/${normalized}`;
  }

  private async readOrchestratorFile(relativePath: string, label: string): Promise<string> {
    const resolved = this.resolveInsideWorkspace(relativePath, label);
    this.assertInside(this.orchestratorRoot, resolved, `${label} must be under .orchestrator`);
    return await fs.readFile(resolved, 'utf-8');
  }

  private resolveInsideWorkspace(relativePath: string, label: string): string {
    if (path.isAbsolute(relativePath)) {
      throw new Error(`${label} must be relative to workspace root.`);
    }

    const resolved = path.resolve(this.workspaceRoot, relativePath);
    this.assertInside(this.workspaceRoot, resolved, `${label} escapes workspace root`);
    return resolved;
  }

  private assertInside(root: string, candidate: string, message: string): void {
    const relative = path.relative(root, candidate);
    if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) return;
    throw new Error(message);
  }
}
