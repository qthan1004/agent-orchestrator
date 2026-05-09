import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export class GitWorktreeManager {
  /**
   * Creates a new git worktree for the specified branch.
   * @param workspaceRoot The root directory of the main repository.
   * @param branchName The name of the branch to create a worktree for.
   * @returns The path to the created worktree.
   */
  public async create(workspaceRoot: string, branchName: string): Promise<string> {
    // Generate a unique path for the worktree inside the OS temp directory
    const worktreeName = `wt-${branchName.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`;
    const worktreePath = path.join(os.tmpdir(), 'agent-orchestrator-worktrees', worktreeName);

    // Ensure the parent directory exists
    const parentDir = path.dirname(worktreePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    try {
      // Execute git worktree add
      // If the branch exists, it will check it out. If not, git worktree add with -b might be needed
      // But the API says: git worktree add <path> <branch>
      // We will assume the branch exists or create it. Using -b to create if it doesn't exist?
      // "git worktree add <path> <branch>" will fail if branch doesn't exist and we don't use -b
      // Let's first try to just run the command as requested.
      const cmd = `git worktree add "${worktreePath}" "${branchName}"`;
      await execAsync(cmd, { cwd: workspaceRoot, timeout: 60000 });
      return worktreePath;
    } catch (error: any) {
      // If git worktree fails because branch doesn't exist, we might want to create it
      if (error.message.includes('invalid reference')) {
         const createCmd = `git worktree add -b "${branchName}" "${worktreePath}"`;
         await execAsync(createCmd, { cwd: workspaceRoot, timeout: 60000 });
         return worktreePath;
      }
      throw new Error(`Failed to create git worktree: ${error.message}`);
    }
  }

  /**
   * Removes a git worktree.
   * @param workspaceRoot The root directory of the main repository (needed for cwd).
   * @param worktreePath The path of the worktree to remove.
   */
  public async remove(workspaceRoot: string, worktreePath: string): Promise<void> {
    try {
      const cmd = `git worktree remove --force "${worktreePath}"`;
      await execAsync(cmd, { cwd: workspaceRoot, timeout: 60000 });
    } catch (error: any) {
      throw new Error(`Failed to remove git worktree: ${error.message}`);
    }
  }

  /**
   * Lists active worktrees.
   * @param workspaceRoot The root directory of the main repository.
   * @returns An array of active worktree paths.
   */
  public async list(workspaceRoot: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git worktree list', { cwd: workspaceRoot, timeout: 60000 });
      const lines = stdout.split('\n').filter(line => line.trim() !== '');
      
      const worktrees: string[] = [];
      for (const line of lines) {
        // Line format: "/path/to/worktree  (commit) [branch]"
        const match = line.match(/^(\S+)/);
        if (match && match[1]) {
           worktrees.push(match[1]);
        }
      }
      return worktrees;
    } catch (error: any) {
      throw new Error(`Failed to list git worktrees: ${error.message}`);
    }
  }
}
