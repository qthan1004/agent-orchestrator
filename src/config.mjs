import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadConfig(overrides = {}) {
  const root = overrides.root || resolve(__dirname, '..');
  return {
    root,
    exchange: {
      base: join(root, 'exchange'),
      inbox: join(root, 'exchange', 'inbox'),
      active: join(root, 'exchange', 'active'),
      outbox: join(root, 'exchange', 'outbox'),
      checkpoints: join(root, 'exchange', 'checkpoints'),
      logs: join(root, 'exchange', 'logs'),
    },
    templates: join(root, 'templates'),
    plans: join(root, 'plan'),
    server: {
      port: overrides.port || 3847,
      host: overrides.host || '127.0.0.1',
    }
  };
}
