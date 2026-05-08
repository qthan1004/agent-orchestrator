import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/** Max files to scan to prevent slowdown on large repos */
const MAX_FILES = 500;

/** Directories to always ignore during scan */
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', '.nuxt', '.cache',
  'coverage', '.turbo', '.parcel-cache',
]);

/** File patterns to always ignore */
const IGNORE_FILE_PATTERNS = [
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
  /\.map$/,
];

/** Paths to ignore (prefix match) */
const IGNORE_PATH_PREFIXES = [
  'exchange/',
  'plan/done/',
];

interface FileEntry {
  path: string;
  type: string;
  size: string;
  purpose: string;
}

interface DepEntry {
  file: string;
  imports: string[];
}

interface CoChangePair {
  fileA: string;
  fileB: string;
  count: number;
}

interface ScanResult {
  status: 'generated' | 'cached';
  outputPath: string;
  stats: {
    filesScanned: number;
    depsFound: number;
    coChangePairs: number;
    truncated: boolean;
  };
}

/**
 * Recursively scan directory, collecting file entries.
 * Respects ignore patterns and max file limit.
 */
function scanDirectory(rootDir: string, currentDir: string, entries: FileEntry[]): void {
  if (entries.length >= MAX_FILES) return;

  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return; // Permission denied or similar
  }

  // Sort for deterministic output
  items.sort((a, b) => a.name.localeCompare(b.name));

  for (const item of items) {
    if (entries.length >= MAX_FILES) return;

    const fullPath = path.join(currentDir, item.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    // Check ignore prefixes
    if (IGNORE_PATH_PREFIXES.some(p => relPath.startsWith(p))) continue;

    if (item.isDirectory()) {
      if (IGNORE_DIRS.has(item.name)) continue;
      scanDirectory(rootDir, fullPath, entries);
    } else if (item.isFile()) {
      if (IGNORE_FILE_PATTERNS.some(p => p.test(item.name))) continue;

      let size: number;
      try {
        size = fs.statSync(fullPath).size;
      } catch {
        size = 0;
      }

      entries.push({
        path: relPath,
        type: inferFileType(relPath),
        size: formatSize(size),
        purpose: inferPurpose(relPath),
      });
    }
  }
}

/**
 * Infer file type from path.
 */
function inferFileType(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase();
  const base = path.basename(relPath).toLowerCase();

  if (base === 'package.json') return 'manifest';
  if (base === 'tsconfig.json') return 'config';
  if (base === 'readme.md') return 'docs';
  if (base === '.gitignore') return 'config';
  if (relPath.includes('index.')) return 'entry';
  if (relPath.startsWith('tests/') || relPath.includes('.test.') || relPath.includes('.spec.')) return 'test';

  const typeMap: Record<string, string> = {
    '.ts': 'source',
    '.js': 'source',
    '.mjs': 'source',
    '.json': 'data',
    '.md': 'docs',
    '.yaml': 'config',
    '.yml': 'config',
    '.toml': 'config',
    '.css': 'style',
    '.html': 'template',
  };
  return typeMap[ext] || 'other';
}

/**
 * Infer purpose from path.
 */
function inferPurpose(relPath: string): string {
  const parts = relPath.split('/');
  const base = path.basename(relPath);

  // Top-level known files
  if (parts.length === 1) {
    if (base === 'package.json') return 'Project manifest';
    if (base === 'tsconfig.json') return 'TypeScript configuration';
    if (base.toLowerCase() === 'readme.md') return 'Project documentation';
    if (base === '.gitignore') return 'Git ignore rules';
  }

  // Folder-based inference
  const folder = parts[0];
  const purposeMap: Record<string, string> = {
    'src': `Source: ${parts.slice(1).join('/')}`,
    'tests': 'Test file',
    'dev-docs': 'Developer documentation',
    'templates': 'Contract template',
    'prompts': 'Agent prompt template',
    'reference': 'Bundled reference resource',
    'plan': 'Plan file',
    'exchange': 'Exchange IPC data',
    'tasks': 'Dev task',
    '.agent': 'Dev agent config',
  };

  return purposeMap[folder] || base;
}

/**
 * Format byte size to human-readable string.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Parse imports from TypeScript/JavaScript files to build dependency graph.
 */
function parseDependencies(rootDir: string, files: FileEntry[]): DepEntry[] {
  const deps: DepEntry[] = [];
  const sourceFiles = files.filter(f =>
    f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.mjs')
  );

  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of sourceFiles) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(rootDir, file.path), 'utf8');
    } catch {
      continue;
    }

    const imports: Set<string> = new Set();

    for (const regex of [importRegex, requireRegex]) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        // Only track local imports (relative paths)
        if (importPath.startsWith('.')) {
          // Normalize: remove .js/.ts extension for display
          const normalized = importPath.replace(/\.(js|ts|mjs)$/, '');
          imports.add(normalized);
        }
      }
    }

    if (imports.size > 0) {
      deps.push({ file: file.path, imports: [...imports] });
    }
  }

  return deps;
}

/**
 * Analyze git log for co-changing file pairs.
 * Returns top N pairs that frequently change together.
 */
function analyzeGitCoChanges(rootDir: string, topN: number = 10): CoChangePair[] {
  try {
    // Get last 100 commits, each with list of changed files
    const output = execSync('git log --name-only --pretty=format:"---COMMIT---" -100', {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 10_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse commits
    const commits = output.split('---COMMIT---')
      .map(block => block.trim().split('\n').filter(f => f.trim().length > 0))
      .filter(files => files.length >= 2);

    // Count co-occurrences
    const pairCounts = new Map<string, number>();

    for (const files of commits) {
      // Only consider commits with <= 20 files to avoid merge commits
      if (files.length > 20) continue;

      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const pair = [files[i], files[j]].sort().join(' ↔ ');
          pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
        }
      }
    }

    // Sort by count descending, take top N
    return [...pairCounts.entries()]
      .filter(([, count]) => count >= 2) // Only pairs that changed together at least twice
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([pair, count]) => {
        const [fileA, fileB] = pair.split(' ↔ ');
        return { fileA, fileB, count };
      });
  } catch {
    // Not a git repo or git not available
    return [];
  }
}

/**
 * Try to read package.json for project metadata.
 */
function readPackageJson(rootDir: string): { name: string; version: string; type: string } | null {
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw);
    return {
      name: pkg.name || 'unknown',
      version: pkg.version || '0.0.0',
      type: pkg.type || 'commonjs',
    };
  } catch {
    return null;
  }
}

/**
 * Generate the workspace-memory.md content.
 */
function generateMarkdown(
  rootDir: string,
  files: FileEntry[],
  deps: DepEntry[],
  coChanges: CoChangePair[],
  truncated: boolean,
): string {
  const pkg = readPackageJson(rootDir);
  const projectName = pkg?.name || path.basename(rootDir);
  const now = new Date().toISOString();

  const lines: string[] = [];

  // Header
  lines.push(`# Workspace Memory — ${projectName}`);
  lines.push(`> Auto-generated by \`scan_workspace\` tool`);
  lines.push(`> Last updated: ${now}`);
  lines.push('');

  // Project Overview
  lines.push('## Project Overview');
  lines.push(`- **Name**: ${projectName}`);
  if (pkg) {
    lines.push(`- **Version**: ${pkg.version}`);
    lines.push(`- **Module system**: ${pkg.type === 'module' ? 'ESM' : 'CommonJS'}`);
  }
  lines.push(`- **Root**: ${rootDir}`);
  lines.push(`- **Files scanned**: ${files.length}${truncated ? ` (truncated at ${MAX_FILES})` : ''}`);
  lines.push('');

  // File Map
  lines.push('## File Map');
  lines.push('| Path | Type | Size | Purpose |');
  lines.push('|------|------|------|---------|');
  for (const f of files) {
    lines.push(`| ${f.path} | ${f.type} | ${f.size} | ${f.purpose} |`);
  }
  lines.push('');

  // Dependency Graph
  lines.push('## Dependency Graph');
  if (deps.length > 0) {
    for (const dep of deps) {
      lines.push(`- \`${dep.file}\` → ${dep.imports.map(i => `\`${i}\``).join(', ')}`);
    }
  } else {
    lines.push('*No local dependencies detected.*');
  }
  lines.push('');

  // Git Intelligence
  lines.push('## Git Intelligence');
  lines.push('Top co-changing file pairs:');
  if (coChanges.length > 0) {
    for (let i = 0; i < coChanges.length; i++) {
      const cc = coChanges[i];
      lines.push(`${i + 1}. \`${cc.fileA}\` ↔ \`${cc.fileB}\` (${cc.count} times)`);
    }
  } else {
    lines.push('*No co-change data available (git history too short or unavailable).*');
  }
  lines.push('');

  // Knowledge Items placeholder
  lines.push('## Knowledge Items');
  lines.push('*Run with Antigravity KI system for knowledge item summaries.*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Execute the scan_workspace logic.
 * @param rootDir - The workspace root to scan
 * @param forceUpdate - Whether to re-scan even if workspace-memory.md exists
 * @returns ScanResult with status and stats
 */
export function executeScanWorkspace(rootDir: string, forceUpdate: boolean): ScanResult {
  const outputPath = path.join(rootDir, '.agent', 'workspace-memory.md');

  // Check cached
  if (!forceUpdate && fs.existsSync(outputPath)) {
    return {
      status: 'cached',
      outputPath,
      stats: { filesScanned: 0, depsFound: 0, coChangePairs: 0, truncated: false },
    };
  }

  // Ensure .agent/ directory exists
  const agentDir = path.join(rootDir, '.agent');
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  // Step 1: Scan file structure
  const files: FileEntry[] = [];
  scanDirectory(rootDir, rootDir, files);
  const truncated = files.length >= MAX_FILES;

  // Step 2: Parse dependency graph
  const deps = parseDependencies(rootDir, files);

  // Step 3: Git co-change analysis
  const coChanges = analyzeGitCoChanges(rootDir);

  // Step 4: Generate markdown
  const markdown = generateMarkdown(rootDir, files, deps, coChanges, truncated);

  // Step 5: Write file
  fs.writeFileSync(outputPath, markdown, 'utf8');

  return {
    status: 'generated',
    outputPath,
    stats: {
      filesScanned: files.length,
      depsFound: deps.length,
      coChangePairs: coChanges.length,
      truncated,
    },
  };
}
