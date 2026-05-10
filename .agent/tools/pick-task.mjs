import fs from 'fs';
import path from 'path';

const PENDING = 'tasks/pending';
const PROCESSING = 'tasks/processing';

// Check if processing already has a task
const processingFiles = fs.existsSync(PROCESSING)
  ? fs.readdirSync(PROCESSING).filter(f => f.endsWith('.md'))
  : [];

if (processingFiles.length > 0) {
  console.log(JSON.stringify({
    error: 'task_in_processing',
    picked: processingFiles[0],
    path: path.join(PROCESSING, processingFiles[0])
  }));
  process.exit(0);
}

// Get pending tasks, sort by name (FIFO by number)
const pendingFiles = fs.existsSync(PENDING)
  ? fs.readdirSync(PENDING).filter(f => f.endsWith('.md')).sort()
  : [];

if (pendingFiles.length === 0) {
  console.log(JSON.stringify({ picked: null }));
  process.exit(0);
}

const picked = pendingFiles[0];
const src = path.join(PENDING, picked);
const dest = path.join(PROCESSING, picked);

fs.mkdirSync(PROCESSING, { recursive: true });
fs.renameSync(src, dest);

console.log(JSON.stringify({ picked, path: dest }));
