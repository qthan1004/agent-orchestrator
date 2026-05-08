import fs from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

export interface WorkspaceMetadata {
  id: string;
  path: string;
  name: string;
  registered_at: string;
}

export class WorkspaceRegistry {
  private registryPath: string;

  constructor(runtimeRoot: string) {
    this.registryPath = join(runtimeRoot, 'workspaces.json');
  }

  public register(workspacePath: string): WorkspaceMetadata {
    const id = createHash('sha256').update(workspacePath).digest('hex').substring(0, 8);
    
    let workspaces: Record<string, WorkspaceMetadata> = {};
    if (fs.existsSync(this.registryPath)) {
      try {
        workspaces = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      } catch (e) {
        // ignore JSON parse error, start fresh
      }
    }

    if (!workspaces[id]) {
      workspaces[id] = {
        id,
        path: workspacePath,
        name: basename(workspacePath),
        registered_at: new Date().toISOString()
      };
      
      // Ensure the directory exists before writing
      const dir = join(this.registryPath, '..');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.registryPath, JSON.stringify(workspaces, null, 2), 'utf-8');
    }

    return workspaces[id];
  }

  public getAll(): WorkspaceMetadata[] {
    if (!fs.existsSync(this.registryPath)) return [];
    try {
      const workspaces = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      return Object.values(workspaces);
    } catch (e) {
      return [];
    }
  }

  public getById(id: string): WorkspaceMetadata | null {
    if (!fs.existsSync(this.registryPath)) return null;
    try {
      const workspaces = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      return workspaces[id] || null;
    } catch (e) {
      return null;
    }
  }
}
