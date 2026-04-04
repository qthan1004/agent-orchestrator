#!/usr/bin/env node

/**
 * task-board.mjs — Scan tasks/ dirs → output MD summary
 * Output: tasks/.tmp/board.md
 * Usage: node tools/task-board.mjs
 */

import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TASKS = join(ROOT, 'tasks');
const TMP = join(TASKS, '.tmp');
const OUTPUT = join(TMP, 'board.md');

function listMd(dir) {
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
  } catch { return []; }
}

function taskNum(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

function run() {
  mkdirSync(TMP, { recursive: true });

  const pending = listMd(join(TASKS, 'pending')).sort((a, b) => taskNum(a) - taskNum(b));
  const processing = listMd(join(TASKS, 'processing')).sort((a, b) => taskNum(a) - taskNum(b));
  const done = listMd(join(TASKS, 'done')).sort((a, b) => taskNum(a) - taskNum(b));
  const total = pending.length + processing.length + done.length;

  const lines = [
    `# Task Board — ${new Date().toISOString().slice(0, 19)}`,
    '',
    `| Status | Count |`,
    `|--------|-------|`,
    `| ⬜ Pending | ${pending.length} |`,
    `| 🔄 Processing | ${processing.length} |`,
    `| ✅ Done | ${done.length} |`,
    `| **Total** | **${total}** |`,
    '',
    `Progress: ${done.length}/${total} (${total ? Math.round(done.length / total * 100) : 0}%)`,
    '',
  ];

  if (processing.length > 0) {
    lines.push('## 🔄 Processing');
    processing.forEach(f => lines.push(`- \`${f}\``));
    lines.push('');
  }

  if (pending.length > 0) {
    lines.push('## ⬜ Pending');
    pending.forEach(f => lines.push(`- \`${f}\``));
    lines.push('');
  }

  if (done.length > 0) {
    lines.push('## ✅ Done');
    done.forEach(f => lines.push(`- \`${f}\``));
    lines.push('');
  }

  // Next available hint
  if (pending.length > 0 && processing.length === 0) {
    lines.push(`**Next**: \`${pending[0]}\``);
  } else if (processing.length > 0) {
    lines.push(`**Current**: \`${processing[0]}\` — finish this first`);
  } else {
    lines.push('**🎉 All tasks done!**');
  }

  writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
  console.log(`✅ Board written to: ${OUTPUT}`);
}

run();
