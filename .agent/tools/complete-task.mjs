import fs from 'fs';
import path from 'path';

const PROCESSING = 'tasks/processing';
const DONE = 'tasks/done';

const files = fs.existsSync(PROCESSING)
  ? fs.readdirSync(PROCESSING).filter(f => f.endsWith('.md'))
  : [];

if (files.length === 0) {
  console.log(JSON.stringify({ error: 'no_task_in_processing' }));
  process.exit(1);
}

const file = files[0];
const src = path.join(PROCESSING, file);
const dest = path.join(DONE, file);

fs.mkdirSync(DONE, { recursive: true });
fs.renameSync(src, dest);

console.log(JSON.stringify({ completed: file, path: dest }));
