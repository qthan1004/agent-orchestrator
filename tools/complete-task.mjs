#!/usr/bin/env node

/**
 * complete-task.mjs — Chuyển task từ processing vào done.
 * Usage: node tools/complete-task.mjs [filename]
 *   - Nếu có argument: move file đó
 *   - Nếu không có argument: move file đầu tiên trong processing
 * 
 * Output JSON: { completed: "<filename>", path: "tasks/done/<filename>" }
 * Cross-platform: Linux + Windows
 */

import { readdirSync, mkdirSync, renameSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROCESSING = join(ROOT, 'tasks', 'processing');
const DONE = join(ROOT, 'tasks', 'done');

function run() {
  mkdirSync(DONE, { recursive: true });

  // Determine which file to complete
  let target = process.argv[2];

  if (!target) {
    // Auto-detect: pick first .md in processing
    const files = readdirSync(PROCESSING).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
      console.log(JSON.stringify({ error: 'No task in processing.' }, null, 2));
      process.exit(1);
    }
    target = files[0];
  }

  const src = join(PROCESSING, target);
  const dst = join(DONE, target);

  try {
    renameSync(src, dst);
  } catch (err) {
    console.log(JSON.stringify({ error: `File not found: ${target}`, detail: err.message }, null, 2));
    process.exit(1);
  }

  const result = {
    completed: target,
    path: `tasks/done/${target}`
  };
  console.log(JSON.stringify(result, null, 2));
}

run();
