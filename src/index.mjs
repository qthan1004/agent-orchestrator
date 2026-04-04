import { startServer } from './mcp-server/index.mjs';

const cmd = process.argv[2];

if (!cmd || cmd === 'serve') {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  console.log(`Unknown command: ${cmd}`);
  process.exit(1);
}
