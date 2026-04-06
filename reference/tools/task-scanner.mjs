import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exchangeDir = path.join(__dirname, '..', '..', 'exchange');
const tmpDir = path.join(exchangeDir, '.tmp');

async function getTasksFromDir(dirName) {
  const dirPath = path.join(exchangeDir, dirName);
  try {
    const files = await fs.readdir(dirPath);
    const tasks = [];
    for (const f of files) {
      if (f.startsWith('task-') && f.endsWith('.json')) {
        const content = await fs.readFile(path.join(dirPath, f), 'utf-8');
        try {
          tasks.push(JSON.parse(content));
        } catch {}
      }
    }
    return tasks;
  } catch {
    return [];
  }
}

function formatTasks(tasks, name) {
  let res = `## ${name} (${tasks.length} tasks)\n`;
  for (const t of tasks) {
    let line = `- \`${t.id || 'unknown'}\` — ${t.title || 'Untitled'}`;
    if (t.assigned_to) line += ` (worker: ${t.assigned_to})`;
    res += line + '\n';
  }
  if (tasks.length === 0) res += '\n';
  return res;
}

async function scan() {
  const inbox = await getTasksFromDir('inbox');
  const active = await getTasksFromDir('active');
  const outbox = await getTasksFromDir('outbox');

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let md = `# Task Scan — ${timestamp}\n`;
  md += formatTasks(inbox, 'Inbox');
  md += formatTasks(active, 'Active');
  md += formatTasks(outbox, 'Outbox');

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'task-scan.md'), md, 'utf-8');
  console.log(`Task scan written to exchange/.tmp/task-scan.md`);
}

scan().catch(console.error);
