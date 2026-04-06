import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exchangeDir = path.join(__dirname, '..', '..', 'exchange');
const dirs = ['inbox', 'active', 'outbox', 'checkpoints', 'logs', '.tmp'];

async function init() {
  await fs.mkdir(exchangeDir, { recursive: true });
  for (const d of dirs) {
    const dirPath = path.join(exchangeDir, d);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, '.gitkeep'), '', 'utf-8');
  }
  console.log(`Directory structure initialized in ${exchangeDir}`);
}

init().catch(console.error);
