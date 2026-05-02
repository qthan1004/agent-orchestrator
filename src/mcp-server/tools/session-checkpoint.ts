import fs from 'fs';
import path from 'path';
import { SESSION_STATUS } from '../../constants.js';

export interface SessionCheckpointInput {
  action: 'save' | 'load' | 'clear';
  task_id?: string;
  progress?: number;
  context?: Record<string, unknown>;
}

export function executeSessionCheckpoint(
  workspaceRoot: string,
  input: SessionCheckpointInput
) {
  const sessionFilePath = path.join(workspaceRoot, '.agent', 'session.json');

  if (input.action === 'save') {
    const dir = path.dirname(sessionFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      saved_at: new Date().toISOString(),
      task_id: input.task_id,
      progress: input.progress,
      context: input.context || {},
      workspace: workspaceRoot
    };

    fs.writeFileSync(sessionFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return { status: SESSION_STATUS.SAVED, file: sessionFilePath };
  } else if (input.action === 'load') {
    if (!fs.existsSync(sessionFilePath)) {
      return { status: SESSION_STATUS.NO_SESSION };
    }
    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    return { status: SESSION_STATUS.LOADED, data: JSON.parse(content) };
  } else if (input.action === 'clear') {
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
    }
    return { status: SESSION_STATUS.CLEARED };
  }

  throw new Error(`Invalid action: ${input.action}`);
}
