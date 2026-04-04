#!/usr/bin/env node

/**
 * git-push.mjs — Git add + commit + push
 * Usage: node tools/git-push.mjs "<commit message>"
 * Example: node tools/git-push.mjs "feat(orchestrator): add task queue"
 */

import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const msg = process.argv[2];
if (!msg) {
  console.error('❌ Usage: node tools/git-push.mjs "<commit message>"');
  process.exit(1);
}

const run = (cmd) => {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
};

try {
  run('git add -A');
  run(`git commit -m "${msg}"`);
  run('git push');
  console.log('✅ Pushed successfully');
} catch (err) {
  console.error('❌ Git push failed');
  process.exit(1);
}
