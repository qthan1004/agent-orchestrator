import fs from 'fs';
import path from 'path';
import { ChatMessage, ChatRole, LLMAdapter, ToolDefinition } from '../worker/adapters/index.js';
import { ToolExecutor } from '../worker/tool-executor.js';
import { TokenCounter } from '../worker/token-counter.js';
import { SYSTEM_MESSAGE } from '../constants.js';
import { UnifiedCheckpoint } from '../models/checkpoint.js';

/** Maximum number of tool-call loop iterations before aborting. */
const MAX_TOOL_CALLS = 50;

export enum HarnessStatus {
  COMPLETE = 'complete',
  CONTEXT_EXCEEDED = 'context_exceeded',
  ERROR = 'error',
  MAX_ITERATIONS = 'max_iterations'
}

const HARNESS_SUMMARY = {
  DEFAULT_COMPLETE: 'Task completed',
  NO_TOOL_CALLS: 'Failed: No tool calls for 3 consecutive turns',
  MALFORMED_JSON: 'Failed: Malformed JSON 3 times',
  SCOPE_VIOLATION: 'scope_violation',
  CONTEXT_HANDOVER: 'Context {percent}% - handover generated'
} as const;

const HANDOVER_PROMPT = [
  'STOP. Your context window is almost full.',
  'Write a handover report for the next worker:',
  '',
  '## Completed',
  '- List files modified and specific changes made',
  '',
  '## In Progress',
  '- What step/task is partially done?',
  '',
  '## Not Started',
  '- Remaining steps from the original task',
  '',
  '## Next Steps',
  '- Where should the next worker start?',
  '- Any important notes or caveats?',
  '',
  'DO NOT call any tools. Write text report only.'
] as const;

const HARNESS_TEXT = {
  ATTEMPTED_FIX_NONE: 'None',
  NO_TOOL_CALLS_ERROR: 'No tool calls',
  NO_TOOL_CALLS_HYPOTHESIS: 'LLM failed to output tool calls 3 times',
  NO_TOOL_CALLS_PROMPT: "You did not call any tools. You must use a tool to progress. If the task is done, use the 'complete_task' tool.",
  MALFORMED_JSON_ERROR: 'Malformed JSON',
  MALFORMED_JSON_HYPOTHESIS: 'LLM consistently fails to format JSON correctly',
  MALFORMED_JSON_ATTEMPTED_FIX: 'Retried 3 times',
  JSON_FIX_PROMPT: 'Please fix the JSON formatting.',
  SCOPE_VIOLATION_HYPOTHESIS: 'Worker attempted to write outside declared target_files',
  SCOPE_VIOLATION_ATTEMPTED_FIX: 'Execution stopped immediately after scope violation',
  REFLEXION_HYPOTHESIS: 'Tools kept failing despite retries',
  REFLEXION_ATTEMPTED_FIX: 'Reflexion loop maxed out at 2',
  FATAL_HYPOTHESIS: 'Fatal exception in runner loop',
  TOKEN_CHECKPOINT_HYPOTHESIS: 'Token limit checkpoint hit during error'
} as const;

export interface HarnessConfig {
  adapter: LLMAdapter;
  model: string;
  contextLimit: number;
  contextThreshold: number;
  tools: ToolDefinition[];
  toolExecutor: ToolExecutor;
  checkpoint?: {
    workspaceRoot: string;
    taskId: string;
  };
}

export interface HarnessResult {
  status: HarnessStatus;
  summary: string;
  tokenUsage: { used: number; limit: number; percent: number };
  handover?: string;
  changelog?: any;
  errorContext?: any;
}

export class LLMHarness {
  private readonly config: HarnessConfig;
  private readonly tokenCounter: TokenCounter;

  constructor(config: HarnessConfig) {
    this.config = config;
    this.tokenCounter = new TokenCounter(config.contextLimit);
  }

  /** Run the tool-calling loop until complete or threshold hit. */
  public async run(messages: ChatMessage[]): Promise<HarnessResult> {
    try {
      let loopCount = 0;
      let consecutiveNoTools = 0;
      let consecutiveMalformedJson = 0;
      let reflexionCount = 0;

      while (loopCount < MAX_TOOL_CALLS) {
        loopCount++;

        const response = await this.config.adapter.chat({
          model: this.config.model,
          messages,
          tools: this.config.tools
        });

        this.tokenCounter.addUsage(response.tokenUsage.promptTokens, response.tokenUsage.completionTokens);
        messages.push(response.message);

        const usage = this.getContextUsage();
        if (usage.percent >= this.config.contextThreshold * 100) {
          return await this.generateHandover(messages);
        }

        const toolCalls = response.message.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
          consecutiveNoTools++;
          if (consecutiveNoTools >= 3) {
            return this.errorResult(HARNESS_SUMMARY.NO_TOOL_CALLS, {
              error: HARNESS_TEXT.NO_TOOL_CALLS_ERROR,
              hypothesis: HARNESS_TEXT.NO_TOOL_CALLS_HYPOTHESIS,
              attempted_fix: HARNESS_TEXT.ATTEMPTED_FIX_NONE
            });
          }
          messages.push({ role: ChatRole.USER, content: HARNESS_TEXT.NO_TOOL_CALLS_PROMPT });
          continue;
        }
        consecutiveNoTools = 0;

        let hasError = false;
        let toolErrorDiagnosis = '';

        for (const call of toolCalls) {
          if (call.function.name === 'complete_task') {
            let summary = HARNESS_SUMMARY.DEFAULT_COMPLETE;
            let changelog: any = undefined;
            try {
              const args = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
              summary = typeof args.summary === 'string' ? args.summary : summary;
              changelog = args.changelog;
            } catch {}

            return {
              status: HarnessStatus.COMPLETE,
              summary,
              tokenUsage: this.getContextUsage(),
              changelog
            };
          }

          let args: Record<string, unknown> = {};
          try {
            args = typeof call.function.arguments === 'string'
              ? JSON.parse(call.function.arguments)
              : call.function.arguments;
            consecutiveMalformedJson = 0;
          } catch (err: any) {
            consecutiveMalformedJson++;
            if (consecutiveMalformedJson >= 3) {
              return this.errorResult(HARNESS_SUMMARY.MALFORMED_JSON, {
                error: HARNESS_TEXT.MALFORMED_JSON_ERROR,
                hypothesis: HARNESS_TEXT.MALFORMED_JSON_HYPOTHESIS,
                attempted_fix: HARNESS_TEXT.MALFORMED_JSON_ATTEMPTED_FIX
              });
            }
            hasError = true;
            toolErrorDiagnosis = `Invalid JSON arguments: ${err.message}`;
            messages.push({
              role: ChatRole.TOOL,
              content: `Error: ${toolErrorDiagnosis}. ${HARNESS_TEXT.JSON_FIX_PROMPT}`,
              name: call.function.name,
              tool_call_id: call.id
            });
            continue;
          }

          const result = await this.config.toolExecutor.execute(call.function.name, args);

          if (result.error) {
            if (result.error.startsWith('SCOPE_VIOLATION:')) {
              return this.errorResult(HARNESS_SUMMARY.SCOPE_VIOLATION, {
                error: result.error,
                hypothesis: HARNESS_TEXT.SCOPE_VIOLATION_HYPOTHESIS,
                attempted_fix: HARNESS_TEXT.SCOPE_VIOLATION_ATTEMPTED_FIX
              });
            }
            hasError = true;
            toolErrorDiagnosis = result.error;
          }

          messages.push({
            role: ChatRole.TOOL,
            content: result.error ? `Error: ${result.error}` : (result.output || 'Success'),
            name: call.function.name,
            tool_call_id: call.id
          });
        }

        if (hasError) {
          reflexionCount++;
          if (reflexionCount > 2) {
            return this.errorResult(`Reflexion failed: ${toolErrorDiagnosis}`, {
              error: toolErrorDiagnosis,
              hypothesis: HARNESS_TEXT.REFLEXION_HYPOTHESIS,
              attempted_fix: HARNESS_TEXT.REFLEXION_ATTEMPTED_FIX
            });
          }
          messages.push({ role: ChatRole.USER, content: `Tool execution failed. Diagnose the error and try a different approach. You have ${3 - reflexionCount} attempts left before aborting.` });
        } else {
          reflexionCount = 0;
        }

        if (this.tokenCounter.shouldCheckpoint()) {
          console.warn(SYSTEM_MESSAGE.AGENT_TOKEN_CHECKPOINT);
          this.writeCheckpoint(hasError, toolErrorDiagnosis);
        }
      }

      return {
        status: HarnessStatus.MAX_ITERATIONS,
        summary: `Failed: Max tool calls (${MAX_TOOL_CALLS}) exceeded`,
        tokenUsage: this.getContextUsage(),
        errorContext: {
          error: `Max tool calls (${MAX_TOOL_CALLS}) exceeded`,
          hypothesis: HARNESS_TEXT.FATAL_HYPOTHESIS,
          attempted_fix: HARNESS_TEXT.ATTEMPTED_FIX_NONE
        }
      };
    } catch (err: any) {
      console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
      return this.errorResult(`Failed: ${err.message}`, {
        error: err.message,
        hypothesis: HARNESS_TEXT.FATAL_HYPOTHESIS,
        attempted_fix: HARNESS_TEXT.ATTEMPTED_FIX_NONE
      });
    }
  }

  /** Get current context usage. */
  public getContextUsage(): { used: number; limit: number; percent: number } {
    const usage = this.tokenCounter.getUsage();
    return {
      used: usage.used,
      limit: usage.limit,
      percent: usage.percentage
    };
  }

  private errorResult(summary: string, errorContext: any): HarnessResult {
    return {
      status: HarnessStatus.ERROR,
      summary,
      tokenUsage: this.getContextUsage(),
      errorContext
    };
  }

  private async generateHandover(messages: ChatMessage[]): Promise<HarnessResult> {
    messages.push({
      role: ChatRole.USER,
      content: HANDOVER_PROMPT.join('\n')
    });

    const response = await this.config.adapter.chat({
      model: this.config.model,
      messages
    });

    this.tokenCounter.addUsage(response.tokenUsage.promptTokens, response.tokenUsage.completionTokens);
    messages.push(response.message);

    const usage = this.getContextUsage();

    return {
      status: HarnessStatus.CONTEXT_EXCEEDED,
      summary: HARNESS_SUMMARY.CONTEXT_HANDOVER.replace('{percent}', String(Math.round(usage.percent))),
      tokenUsage: usage,
      handover: response.message.content
    };
  }

  private writeCheckpoint(hasError: boolean, toolErrorDiagnosis: string): void {
    if (!this.config.checkpoint) return;

    try {
      const cpPath = path.join(this.config.checkpoint.workspaceRoot, '.agent', 'session.json');
      const cpData: UnifiedCheckpoint & { version: number; created_at: string; updated_at: string } = {
        version: 3,
        task_id: this.config.checkpoint.taskId,
        phase: 'implementation',
        files_changed: [],
        completed_steps: [],
        remaining_steps: [],
        error_context: hasError ? {
          error: toolErrorDiagnosis,
          hypothesis: HARNESS_TEXT.TOKEN_CHECKPOINT_HYPOTHESIS,
          attempted_fix: HARNESS_TEXT.ATTEMPTED_FIX_NONE
        } : null,
        token_usage: {
          used: this.tokenCounter.getUsage().used,
          limit: this.tokenCounter.getUsage().limit
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (fs.existsSync(cpPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(cpPath, 'utf-8'));
          if (existing.created_at) cpData.created_at = existing.created_at;
          if (Array.isArray(existing.files_changed)) cpData.files_changed = existing.files_changed;
          if (Array.isArray(existing.completed_steps)) cpData.completed_steps = existing.completed_steps;
          if (Array.isArray(existing.remaining_steps)) cpData.remaining_steps = existing.remaining_steps;
        } catch {}
      } else {
        const dir = path.dirname(cpPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(cpPath, JSON.stringify(cpData, null, 2), 'utf-8');
    } catch (e: any) {
      console.error(SYSTEM_MESSAGE.AGENT_ERROR, `Failed to write checkpoint: ${e.message}`);
    }
  }
}
