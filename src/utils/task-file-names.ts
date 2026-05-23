import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { FILE_PREFIXES } from '../constants.js';

const MAX_SAFE_ID_LENGTH = 120;

function hashId(taskId: string): string {
  return crypto.createHash('sha256').update(taskId).digest('hex').slice(0, 10);
}

export function safeTaskFileStem(taskId: string): string {
  const safe = taskId
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SAFE_ID_LENGTH)
    .replace(/^-+|-+$/g, '');
  return `${safe || 'task'}-${hashId(taskId)}`;
}

export function taskFileName(taskId: string): string {
  return `${FILE_PREFIXES.TASK}${safeTaskFileStem(taskId)}.json`;
}

export function resultFileName(taskId: string): string {
  return `${FILE_PREFIXES.RESULT}${safeTaskFileStem(taskId)}.json`;
}

export function taskFilePath(dir: string, taskId: string): string {
  return path.join(dir, taskFileName(taskId));
}

export function resultFilePath(dir: string, taskId: string): string {
  return path.join(dir, resultFileName(taskId));
}

export function findTaskFilePath(dir: string, taskId: string): string {
  const safePath = taskFilePath(dir, taskId);
  if (fs.existsSync(safePath)) return safePath;

  const legacyPath = path.join(dir, `${FILE_PREFIXES.TASK}${taskId}.json`);
  if (fs.existsSync(legacyPath)) return legacyPath;

  if (!fs.existsSync(dir)) return safePath;
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.startsWith(FILE_PREFIXES.TASK) || !filename.endsWith('.json')) continue;
    const fullPath = path.join(dir, filename);
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as { id?: string; task_id?: string };
      if (data.id === taskId || data.task_id === taskId) {
        return fullPath;
      }
    } catch {
      // Ignore malformed task files while resolving a path.
    }
  }

  return safePath;
}
