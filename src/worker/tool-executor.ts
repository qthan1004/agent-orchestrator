import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const COMMAND_TIMEOUT_MS = 60_000;

export interface ToolResult {
  output?: string;
  error?: string;
}

export class ToolExecutor {
  private workspaceRoot: string;
  private allowedTools: Set<string>;
  private declaredTargetFiles: Set<string>;
  private callCount: number = 0;
  private maxCalls: number = 50;

  constructor(workspaceRoot: string, allowedTools: string[], declaredTargetFiles: string[] = []) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.allowedTools = new Set(allowedTools);
    this.declaredTargetFiles = new Set(
      declaredTargetFiles
        .map(file => file.replace(/\\/g, '/').replace(/^\.?\//, ''))
        .filter(Boolean)
    );
  }

  public getCallCount(): number {
    return this.callCount;
  }

  private resolvePath(inputPath: string): string {
    // Treat absolute paths as relative to workspaceRoot to prevent escaping via absolute path
    const sanitizedInput = inputPath.replace(/^([a-zA-Z]:)?[\/\\]+/, '');
    const resolved = path.resolve(this.workspaceRoot, sanitizedInput);
    
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(`Path sandbox violation: path outside workspace (${inputPath})`);
    }
    
    // Check symlinks (if file exists, resolve real path and check again)
    if (fs.existsSync(resolved)) {
      const realPath = fs.realpathSync(resolved);
      if (!realPath.startsWith(this.workspaceRoot)) {
        throw new Error(`Path sandbox violation: symlink outside workspace (${inputPath})`);
      }
    }
    
    return resolved;
  }

  private ensureWriteAllowed(inputPath: string): void {
    if (this.declaredTargetFiles.size === 0) return;

    const resolved = this.resolvePath(inputPath);
    const relativePath = path.relative(this.workspaceRoot, resolved).replace(/\\/g, '/');

    if (!this.declaredTargetFiles.has(relativePath)) {
      throw new Error(`SCOPE_VIOLATION: file not in declared target_files (${inputPath})`);
    }
  }

  public async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (this.callCount >= this.maxCalls) {
      throw new Error(`Tool limit exceeded: Max ${this.maxCalls} calls per session allowed.`);
    }
    
    this.callCount++;

    if (!this.allowedTools.has(toolName)) {
      return { error: `Tool not allowed or unknown: ${toolName}` };
    }

    try {
      switch (toolName) {
        case 'view_file':
          return await this.viewFile(args);
        case 'list_dir':
          return await this.listDir(args);
        case 'write_to_file':
          return await this.writeToFile(args);
        case 'replace_file_content':
          return await this.replaceFileContent(args);
        case 'run_command':
          return await this.runCommand(args);
        default:
          return { error: `Tool implementation missing: ${toolName}` };
      }
    } catch (err: any) {
      return { error: err.message || String(err) };
    }
  }

  private async viewFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (typeof args.path !== 'string') throw new Error('Missing or invalid path');
    const p = this.resolvePath(args.path);
    
    if (!fs.existsSync(p)) {
      throw new Error(`File not found: ${args.path}`);
    }
    
    const content = await fs.promises.readFile(p, 'utf-8');
    let lines = content.split('\n');
    
    if (typeof args.start_line === 'number' && args.start_line >= 1) {
      const endLine = typeof args.end_line === 'number' ? args.end_line : lines.length;
      lines = lines.slice(args.start_line - 1, endLine);
    }
    
    return { output: lines.join('\n') };
  }

  private async listDir(args: Record<string, unknown>): Promise<ToolResult> {
    if (typeof args.path !== 'string') throw new Error('Missing or invalid path');
    const p = this.resolvePath(args.path);
    
    if (!fs.existsSync(p)) {
      throw new Error(`Directory not found: ${args.path}`);
    }
    
    const stat = await fs.promises.stat(p);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${args.path}`);
    }
    
    const entries = await fs.promises.readdir(p, { withFileTypes: true });
    const result = entries.map(e => `${e.isDirectory() ? 'DIR ' : 'FILE'} ${e.name}`).join('\n');
    
    return { output: result || '(empty directory)' };
  }

  private async writeToFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (typeof args.path !== 'string') throw new Error('Missing or invalid path');
    if (typeof args.content !== 'string') throw new Error('Missing or invalid content');
    
    this.ensureWriteAllowed(args.path);
    const p = this.resolvePath(args.path);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.writeFile(p, args.content, 'utf-8');
    
    return { output: `File written successfully: ${args.path}` };
  }

  private async replaceFileContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (typeof args.path !== 'string') throw new Error('Missing or invalid path');
    if (typeof args.target !== 'string') throw new Error('Missing or invalid target string');
    if (typeof args.replacement !== 'string') throw new Error('Missing or invalid replacement string');
    
    this.ensureWriteAllowed(args.path);
    const p = this.resolvePath(args.path);
    if (!fs.existsSync(p)) {
      throw new Error(`File not found: ${args.path}`);
    }
    
    const content = await fs.promises.readFile(p, 'utf-8');
    if (!content.includes(args.target)) {
      throw new Error(`Target string not found in file: ${args.path}`);
    }
    
    const newContent = content.replace(args.target, args.replacement);
    await fs.promises.writeFile(p, newContent, 'utf-8');
    
    return { output: `File content replaced successfully: ${args.path}` };
  }

  private async runCommand(args: Record<string, unknown>): Promise<ToolResult> {
    if (typeof args.command !== 'string') throw new Error('Missing or invalid command');
    
    let cwd = this.workspaceRoot;
    if (typeof args.cwd === 'string') {
      cwd = this.resolvePath(args.cwd);
    }
    
    if (!fs.existsSync(cwd)) {
      throw new Error(`Working directory not found: ${args.cwd}`);
    }
    
    try {
      const { stdout, stderr } = await execAsync(args.command, { cwd, timeout: COMMAND_TIMEOUT_MS });
      return { output: stdout + (stderr ? '\nSTDERR:\n' + stderr : '') };
    } catch (err: any) {
      return { error: `Command failed: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}` };
    }
  }
}
