import fs from 'node:fs/promises';
import path from 'node:path';
import { SYSTEM_MESSAGE } from '../constants.js';

export interface PromptTask {
  id: string;
  action: string;
  module: string;
  workspaceRoot: string;
}

/**
 * Builds system prompts for worker agents by combining base rules
 * with action-specific skills.
 */
export class PromptBuilder {
  private promptsDir: string;

  constructor(promptsDir: string = path.join(process.cwd(), 'prompts', 'workers')) {
    this.promptsDir = promptsDir;
  }

  /**
   * Generates the complete prompt for a given task.
   */
  public async buildPrompt(task: PromptTask): Promise<string> {
    const basePath = path.join(this.promptsDir, 'base-worker.md');
    let baseContent = '';
    try {
      baseContent = await fs.readFile(basePath, 'utf-8');
    } catch (error: any) {
      console.error(SYSTEM_MESSAGE.PROMPT_BASE_FAILED(basePath, error.message));
      baseContent = '# Base Worker Rules\nBase rules not found. Please ensure prompts/workers/base-worker.md exists.';
    }

    const skillPath = path.join(this.promptsDir, `skill-${task.action}.md`);
    let skillContent = '';
    try {
      skillContent = await fs.readFile(skillPath, 'utf-8');
    } catch (error: any) {
      console.error(SYSTEM_MESSAGE.PROMPT_SKILL_FAILED(skillPath, error.message));
      skillContent = `> Note: No specific skill instructions found for action '${task.action}'.`;
    }

    let finalPrompt = `${baseContent}\n\n---\n\n${skillContent}`;

    // Replace template variables
    finalPrompt = finalPrompt.replace(/\{\{task_id\}\}/g, task.id);
    finalPrompt = finalPrompt.replace(/\{\{action\}\}/g, task.action);
    finalPrompt = finalPrompt.replace(/\{\{module\}\}/g, task.module);
    finalPrompt = finalPrompt.replace(/\{\{workspace_root\}\}/g, task.workspaceRoot);

    return finalPrompt;
  }
}
