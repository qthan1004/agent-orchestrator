#!/usr/bin/env node

/**
 * pick-task.mjs — Quét tasks/pending, pick file FIFO (số nhỏ nhất), move vào processing.
 * Output JSON: { picked: "<filename>", path: "tasks/processing/<filename>" }
 * Nếu không có task: { picked: null }
 * Nếu đang có task processing: { error: "...", current: "<filename>" }
 * 
 * Usage: node tools/pick-task.mjs
 * Cross-platform: Linux + Windows
 */

import { readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PENDING = join(ROOT, 'tasks', 'pending');
const PROCESSING = join(ROOT, 'tasks', 'processing');

function taskNum(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

function run() {
  // Ensure dirs exist
  mkdirSync(PENDING, { recursive: true });
  mkdirSync(PROCESSING, { recursive: true });

  // Check if there's already a task in processing
  const currentProcessing = readdirSync(PROCESSING).filter(f => f.endsWith('.md'));
  if (currentProcessing.length > 0) {
    const result = { error: 'Already have task in processing. Finish it first.', current: currentProcessing[0] };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // List pending tasks
  const pending = readdirSync(PENDING)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort((a, b) => taskNum(a) - taskNum(b));

  if (pending.length === 0) {
    console.log(JSON.stringify({ picked: null, message: 'No pending tasks.' }, null, 2));
    process.exit(0);
  }

  // Pick first (FIFO — smallest number)
  const target = pending[0];
  const src = join(PENDING, target);
  const dst = join(PROCESSING, target);

  renameSync(src, dst);

  const result = {
    picked: target,
    path: `tasks/processing/${target}`,
    remaining: pending.length - 1
  };
  console.log(JSON.stringify(result, null, 2));
}

run();
