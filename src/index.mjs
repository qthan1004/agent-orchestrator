import { startServer } from './mcp-server/index.mjs';
import { loadConfig } from './config.mjs';

const args = process.argv.slice(2);
const isServe = args.includes('serve') || args.length === 0;
const portIdx = args.indexOf('--port');

const overrides = {};
if (portIdx !== -1 && args[portIdx + 1]) {
  overrides.port = parseInt(args[portIdx + 1], 10);
}

const config = loadConfig(overrides);

if (isServe) {
  startServer(config.server).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  console.log(`Unknown command: ${args.join(' ')}`);
  process.exit(1);
}
