#!/usr/bin/env node

/**
 * code-index.mjs — Scan src/ → generate code map MD
 * Output: tasks/.tmp/code-index.md
 * Usage: node tools/code-index.mjs
 *
 * Mục đích: Agent đọc file này để hiểu codebase structure,
 * biết module nào export gì, import gì → đảm bảo consistency.
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const TMP = join(ROOT, 'tasks', '.tmp');
const OUTPUT = join(TMP, 'code-index.md');

function walkDir(dir, base = dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...walkDir(full, base));
      } else if (['.mjs', '.js', '.mts', '.ts'].includes(extname(entry))) {
        results.push({ path: full, rel: relative(base, full), size: stat.size });
      }
    }
  } catch { /* dir doesn't exist yet */ }
  return results;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const imports = [];
  const exports = [];
  const classes = [];
  const functions = [];

  for (const line of lines) {
    // Imports
    const imp = line.match(/^import\s+(?:(\{[^}]+\})|(\w+))\s+from\s+['"]([^'"]+)['"]/);
    if (imp) {
      imports.push({ what: (imp[1] || imp[2]).trim(), from: imp[3] });
    }

    // Named exports
    if (line.match(/^export\s+(function|class|const|let|async\s+function)/)) {
      const name = line.match(/(?:function|class|const|let)\s+(\w+)/);
      if (name) exports.push(name[1]);
    }

    // Export default
    if (line.match(/^export\s+default/)) {
      exports.push('default');
    }

    // Classes
    const cls = line.match(/^(?:export\s+)?class\s+(\w+)/);
    if (cls) classes.push(cls[1]);

    // Functions (top-level)
    const fn = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (fn) functions.push(fn[1]);
  }

  return { imports, exports, classes, functions, lineCount: lines.length };
}

function run() {
  mkdirSync(TMP, { recursive: true });

  const files = walkDir(SRC);
  const lines = [
    `# Code Index — ${new Date().toISOString().slice(0, 19)}`,
    '',
    `Source: \`src/\` | Files: ${files.length}`,
    '',
  ];

  if (files.length === 0) {
    lines.push('> ⚠️ No source files found in `src/`. Project not initialized yet.');
    writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
    console.log(`✅ Index written to: ${OUTPUT}`);
    return;
  }

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| File | Lines | Exports | Classes | Functions |');
  lines.push('|------|-------|---------|---------|-----------|');

  const analyses = files.map(f => ({ ...f, ...analyzeFile(f.path) }));

  for (const a of analyses) {
    lines.push(`| \`${a.rel}\` | ${a.lineCount} | ${a.exports.length} | ${a.classes.length} | ${a.functions.length} |`);
  }
  lines.push('');

  // Detail per file
  lines.push('## Details');
  lines.push('');

  for (const a of analyses) {
    lines.push(`### \`${a.rel}\``);
    lines.push('');

    if (a.imports.length > 0) {
      lines.push('**Imports**:');
      for (const imp of a.imports) {
        lines.push(`- \`${imp.what}\` ← \`${imp.from}\``);
      }
    }

    if (a.exports.length > 0) {
      lines.push(`**Exports**: ${a.exports.map(e => `\`${e}\``).join(', ')}`);
    }

    if (a.classes.length > 0) {
      lines.push(`**Classes**: ${a.classes.map(c => `\`${c}\``).join(', ')}`);
    }

    if (a.functions.length > 0) {
      lines.push(`**Functions**: ${a.functions.map(f => `\`${f}\``).join(', ')}`);
    }

    lines.push(`**Lines**: ${a.lineCount}`);
    lines.push('');
  }

  // Import graph
  lines.push('## Import Graph');
  lines.push('');
  lines.push('```');
  for (const a of analyses) {
    const localImports = a.imports.filter(i => i.from.startsWith('.'));
    if (localImports.length > 0) {
      for (const imp of localImports) {
        lines.push(`${a.rel} → ${imp.from}`);
      }
    }
  }
  lines.push('```');

  writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
  console.log(`✅ Index written to: ${OUTPUT}`);
}

run();
