#!/usr/bin/env node

/**
 * check-deps.mjs — Check if a task's dependencies are met
 * Output: tasks/.tmp/deps-check.md
 * Usage: node tools/check-deps.mjs 04
 *        node tools/check-deps.mjs          (check all pending)
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TASKS = join(ROOT, 'tasks');
const TMP = join(TASKS, '.tmp');
const OUTPUT = join(TMP, 'deps-check.md');

function listMd(dir) {
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
  } catch { return []; }
}

function taskNum(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractDeps(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const deps = [];

    // Pattern: "- `01-mcp_init-project` phải xong trước"
    // Pattern: "- `05-mcp_config-mcp-remote` phải xong trước"
    const matches = content.matchAll(/`(\d{2}-[^`]+)`\s*phải xong/g);
    for (const m of matches) {
      const num = parseInt(m[1].slice(0, 2), 10);
      if (!isNaN(num)) deps.push(num);
    }

    // Also check "None" or "đây là task đầu tiên"
    if (content.includes('None — đây là task đầu tiên') || content.includes('Dependencies\n\n- None')) {
      return [];
    }

    return deps;
  } catch { return []; }
}

function run() {
  mkdirSync(TMP, { recursive: true });

  const doneFiles = listMd(join(TASKS, 'done'));
  const doneNums = new Set(doneFiles.map(taskNum).filter(Boolean));

  const pendingFiles = listMd(join(TASKS, 'pending'));
  const targetArg = process.argv[2]; // e.g. "04"

  const lines = [
    `# Dependency Check — ${new Date().toISOString().slice(0, 19)}`,
    '',
  ];

  const tasksToCheck = targetArg
    ? pendingFiles.filter(f => f.startsWith(targetArg))
    : pendingFiles;

  if (tasksToCheck.length === 0) {
    lines.push(targetArg ? `Task ${targetArg} not found in pending/` : 'No pending tasks.');
    writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
    console.log(`✅ Check written to: ${OUTPUT}`);
    return;
  }

  let readyCount = 0;

  for (const file of tasksToCheck.sort((a, b) => taskNum(a) - taskNum(b))) {
    const num = taskNum(file);
    const deps = extractDeps(join(TASKS, 'pending', file));
    const met = deps.filter(d => doneNums.has(d));
    const unmet = deps.filter(d => !doneNums.has(d));
    const ready = unmet.length === 0;

    if (ready) readyCount++;

    lines.push(`## ${file}`);
    lines.push(`- **Status**: ${ready ? '✅ READY' : '🔒 BLOCKED'}`);
    if (deps.length === 0) {
      lines.push('- **Dependencies**: None');
    } else {
      lines.push(`- **Dependencies**: ${deps.map(d => '`' + String(d).padStart(2, '0') + '`').join(', ')}`);
      if (met.length > 0) lines.push(`- **Met**: ${met.map(d => `✅ ${String(d).padStart(2, '0')}`).join(', ')}`);
      if (unmet.length > 0) lines.push(`- **Unmet**: ${unmet.map(d => `❌ ${String(d).padStart(2, '0')}`).join(', ')}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`**Ready**: ${readyCount}/${tasksToCheck.length} tasks can be started now`);

  writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
  console.log(`✅ Check written to: ${OUTPUT}`);
}

run();
