import fs from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { bootstrapWorkspace } from './bootstrap.js';

/** Workspace lifecycle status */
export type WorkspaceStatus = 'active' | 'closed';

export interface WorkspaceMetadata {
  id: string;
  path: string;
  name: string;
  status: WorkspaceStatus;
  registered_at: string;
  closed_at?: string;
}

/**
 * Derive a deterministic workspace ID from an absolute workspace path.
 * Uses SHA-256, truncated to 8 hex characters.
 * This is the single source of truth for workspace ID generation.
 *
 * @param workspacePath - Absolute path to the workspace root
 * @returns 8-character hex string
 */
export function generateWorkspaceId(workspacePath: string): string {
  return createHash('sha256').update(workspacePath).digest('hex').substring(0, 8);
}

export class WorkspaceRegistry {
  private registryPath: string;

  constructor(runtimeRoot: string) {
    this.registryPath = join(runtimeRoot, 'workspaces.json');
  }

  private loadAll(): Record<string, WorkspaceMetadata> {
    if (!fs.existsSync(this.registryPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
    } catch (e) {
      return {};
    }
  }

  private saveAll(workspaces: Record<string, WorkspaceMetadata>): void {
    const dir = join(this.registryPath, '..');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.registryPath, JSON.stringify(workspaces, null, 2), 'utf-8');
  }

  /**
   * Register a new workspace (fresh import).
   * If workspace is already active, returns existing metadata.
   * If workspace was previously closed, throws — use reopen() instead.
   *
   * @param workspacePath - Absolute path to workspace root
   * @throws Error if path doesn't exist or workspace is closed
   */
  public register(workspacePath: string): WorkspaceMetadata {
    const id = generateWorkspaceId(workspacePath);
    const workspaces = this.loadAll();

    // Validate path exists on disk
    if (!fs.existsSync(workspacePath)) {
      throw new Error(
        `Workspace path does not exist: "${workspacePath}". ` +
        `Cannot register a workspace with a missing or moved directory.`
      );
    }

    if (!workspaces[id]) {
      // Fresh import — new workspace
      const workspace: WorkspaceMetadata = {
        id,
        path: workspacePath,
        name: basename(workspacePath),
        status: 'active',
        registered_at: new Date().toISOString()
      };
      const boot = bootstrapWorkspace(workspacePath, workspace);
      if (boot.failed.length > 0) {
        throw new Error(`Failed to bootstrap workspace "${id}": ${boot.failed.join(', ')}`);
      }
      workspaces[id] = workspace;
      this.saveAll(workspaces);
    } else if (workspaces[id].status === 'closed') {
      // Previously closed workspace — use explicit reopen()
      throw new Error(
        `Workspace "${id}" (${workspaces[id].name}) was previously closed. ` +
        `Use reopen() to explicitly reconnect it.`
      );
    } else {
      const boot = bootstrapWorkspace(workspacePath, workspaces[id]);
      if (boot.failed.length > 0) {
        throw new Error(`Failed to bootstrap workspace "${id}": ${boot.failed.join(', ')}`);
      }
    }
    // else: already active — return existing metadata

    return workspaces[id];
  }

  /**
   * Explicitly reopen a previously closed workspace.
   *
   * Reconnect policy:
   * - workspace_id is reused only when the canonical path matches exactly.
   * - Path must still exist on disk; fails clearly if missing or moved.
   * - Never auto-reconnects silently — caller must invoke this explicitly.
   * - Resumes existing runtime state: plans, queue, checkpoints, memory
   *   are left intact on disk and become active again.
   *
   * @param workspaceId - The workspace ID to reopen
   * @returns The reactivated workspace metadata
   * @throws Error if workspace not found, path missing, or path moved
   */
  public reopen(workspaceId: string): WorkspaceMetadata {
    const workspaces = this.loadAll();
    const ws = workspaces[workspaceId];

    if (!ws) {
      throw new Error(`Workspace "${workspaceId}" not found in registry.`);
    }

    if (ws.status === 'active') {
      return ws; // Already active, no-op
    }

    // Validate: canonical path must still exist
    if (!fs.existsSync(ws.path)) {
      throw new Error(
        `Cannot reopen workspace "${workspaceId}" (${ws.name}): ` +
        `path "${ws.path}" no longer exists on disk. ` +
        `The workspace may have been moved or deleted.`
      );
    }

    // Reactivate
    ws.status = 'active';
    delete ws.closed_at;
    this.saveAll(workspaces);
    return ws;
  }

  /**
   * Close/detach a workspace from the server.
   *
   * Behavior:
   * - Marks workspace status as 'closed'.
   * - Closed workspace stops accepting new plans and task assignments.
   * - Runtime state on disk is preserved (never deleted by close).
   * - Active tasks/workers must be drained externally before close,
   *   or forcefully handled by the caller.
   *
   * @param workspaceId - The workspace ID to close
   * @returns The updated metadata, or null if workspace not found
   */
  public close(workspaceId: string): WorkspaceMetadata | null {
    const workspaces = this.loadAll();
    const ws = workspaces[workspaceId];
    if (!ws) return null;

    ws.status = 'closed';
    ws.closed_at = new Date().toISOString();
    this.saveAll(workspaces);
    return ws;
  }

  /**
   * Check if a workspace is active (accepting new work).
   */
  public isActive(workspaceId: string): boolean {
    const ws = this.getById(workspaceId);
    if (!ws) return false;
    return ws.status === 'active';
  }

  public getAll(): WorkspaceMetadata[] {
    return Object.values(this.loadAll());
  }

  public getById(id: string): WorkspaceMetadata | null {
    const workspaces = this.loadAll();
    return workspaces[id] || null;
  }
}
