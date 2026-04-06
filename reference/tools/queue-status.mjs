import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exchangeDir = path.join(__dirname, '..', '..', 'exchange');
const tmpDir = path.join(exchangeDir, '.tmp');

async function getFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f !== '.gitkeep' && !f.startsWith('.'));
  } catch {
    return [];
  }
}

async function status() {
  const inbox = await getFiles(path.join(exchangeDir, 'inbox'));
  const active = await getFiles(path.join(exchangeDir, 'active'));
  const outbox = await getFiles(path.join(exchangeDir, 'outbox'));

  const total = inbox.length + active.length + outbox.length;
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let md = `# Queue Status — ${timestamp}\n| Status | Count | Tasks |\n|--------|-------|-------|\n`;
  md += `| Pending | ${inbox.length} | ${inbox.join(', ')} |\n`;
  md += `| Active | ${active.length} | ${active.join(', ')} |\n`;
  md += `| Done | ${outbox.length} | ${outbox.join(', ')} |\n`;
  md += `| **Total** | **${total}** | |\n`;

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'queue-status.md'), md, 'utf-8');
  console.log(`Queue status written to exchange/.tmp/queue-status.md`);
}

status().catch(console.error);
