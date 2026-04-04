import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, '..', 'exchange', '.tmp');

async function checkHealth() {
  const port = process.argv[2] || 3847;
  const url = `http://127.0.0.1:${port}/health`;
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  let statusStr = '';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    statusStr = `# Health Check — ${timestamp}\n- **Status**: ✅ Running\n- **Port**: ${port}\n- **Uptime**: ${data.uptime || 0}s\n- **Workers**: ${data.workers || 0}\n`;
  } catch (err) {
    statusStr = `# Health Check — ${timestamp}\n- **Status**: ❌ Failed (${err.message})\n- **Port**: ${port}\n`;
  }

  await fs.mkdir(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, 'health.md');
  await fs.writeFile(outPath, statusStr, 'utf-8');
  console.log(`Health status written to: ${outPath}`);
}

checkHealth().catch(console.error);
