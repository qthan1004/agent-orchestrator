import { startServer } from './mcp-server/index.js';
import { loadConfig } from './config.js';
import { promptConfig } from './utils/startup-prompt.js';
import type { ConfigOverrides } from './models/index.js';
import { SYSTEM_MESSAGE } from './constants.js';

const args: string[] = process.argv.slice(2);
const isServe = args.includes('serve') || args.length === 0;
const portIdx = args.indexOf('--port');

let overrides: ConfigOverrides = {};
if (portIdx !== -1 && args[portIdx + 1]) {
  overrides.port = parseInt(args[portIdx + 1], 10);
}

if (isServe) {
  const promptOverrides = await promptConfig();
  // CLI overrides take precedence
  overrides = { ...promptOverrides, ...overrides };
  
  const config = loadConfig(overrides);
  
  startServer(config).catch(err => {
    console.error(SYSTEM_MESSAGE.SERVER_START_FAILED, err);
    process.exit(1);
  });
} else {
  console.log(SYSTEM_MESSAGE.SERVER_UNKNOWN_CMD(args.join(' ')));
  process.exit(1);
}
