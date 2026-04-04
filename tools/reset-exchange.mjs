#!/usr/bin/env node
/**
 * Reset exchange/ directory to clean state.
 * Removes all task files, results, workers, queue, checkpoints, and logs.
 * Keeps directory structure intact.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exchangeDir = path.resolve(__dirname, '..', 'exchange');

const DIRS_TO_CLEAN = ['inbox', 'active', 'outbox', 'checkpoints', 'logs'];
const ROOT_FILES_TO_CLEAN = ['_queue.json', 'workers.json'];

let cleaned = 0;

// Clean subdirectories
for (const dir of DIRS_TO_CLEAN) {
  const dirPath = path.join(exchangeDir, dir);
  if (!fs.existsSync(dirPath)) continue;
  
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    fs.unlinkSync(path.join(dirPath, file));
    cleaned++;
  }
}

// Clean root files
for (const file of ROOT_FILES_TO_CLEAN) {
  const filePath = path.join(exchangeDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    cleaned++;
  }
}

console.log(`✅ Exchange cleaned: ${cleaned} files removed`);
console.log(`   Dirs preserved: ${DIRS_TO_CLEAN.join(', ')}`);
