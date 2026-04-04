import { startServer } from './mcp-server/index.mjs';

const args = process.argv.slice(2);
const isServe = args.includes('serve') || args.length === 0;
const portIdx = args.indexOf('--port');
let port = 3847;

if (portIdx !== -1 && args[portIdx + 1]) {
  port = parseInt(args[portIdx + 1], 10);
}

if (isServe) {
  startServer(port).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  console.log(`Unknown command: ${args.join(' ')}`);
  process.exit(1);
}
