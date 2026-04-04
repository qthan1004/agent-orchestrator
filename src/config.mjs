import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DIR_NAMES } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadConfig(overrides = {}) {
  const root = overrides.root || resolve(__dirname, '..');
  return {
    root,
    exchange: {
      base: join(root, DIR_NAMES.EXCHANGE),
      inbox: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.INBOX),
      active: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.ACTIVE),
      outbox: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.OUTBOX),
      checkpoints: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.CHECKPOINTS),
      logs: join(root, DIR_NAMES.EXCHANGE, DIR_NAMES.LOGS),
    },
    templates: join(root, DIR_NAMES.TEMPLATES),
    plans: join(root, DIR_NAMES.PLAN),
    server: {
      port: overrides.port || 3847,
      host: overrides.host || '127.0.0.1',
    }
  };
}
