import fs from 'fs';
import path from 'path';
import { ChatMessage, ChatRole, LLMAdapter, ToolDefinition } from '../worker/adapters/index.js';
import { ToolExecutor } from '../worker/tool-executor.js';
import { TokenCounter } from '../worker/token-counter.js';
import { SYSTEM_MESSAGE } from '../constants.js';
import { UnifiedCheckpoint } from '../models/checkpoint.js';
import type { HarnessActivityDetails } from '../runtime/models.js';
import {
  HANDOVER_PROMPT,
  HARNESS_LIMITS,
  HARNESS_LOG,
  HARNESS_STATUS,
  HARNESS_SUMMARY,
  HARNESS_TEXT,
} from './constants.js';

export const HarnessStatus = HARNESS_STATUS;
export type HarnessStatus = (typeof HARNESS_STATUS)[keyof typeof HARNESS_STATUS];

function truncateForLog(value: string, maxLength: number = HARNESS_LIMITS.TOOL_PREVIEW_LIMIT): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function formatToolCallPreview(toolName: string, args: Record<string, unknown>): string {
  const fields = ['path', 'cwd', 'command'];
  const previewParts: string[] = [];

  for (const field of fields) {
    const value = args[field];
    if (typeof value === 'string' && value.trim() !== '') {
      previewParts.push(`${field}=${truncateForLog(value)}`);
    }
  }

  if (toolName === 'write_to_file' && typeof args.content === 'string') {
    previewParts.push(`content=${args.content.length} chars`);
  }

  if (toolName === 'replace_file_content') {
    if (typeof args.target === 'string') previewParts.push(`target=${args.target.length} chars`);
    if (typeof args.replacement === 'string') previewParts.push(`replacement=${args.replacement.length} chars`);
  }

  return previewParts.length > 0 ? ` (${previewParts.join(', ')})` : '';
}

export interface HarnessConfig {
  adapter: LLMAdapter;
  model: string;
  contextLimit: number;
  contextThreshold: number;
  tools: ToolDefinition[];
  toolExecutor: ToolExecutor;
  onLifecycle?: (phase: string, message: string, details?: HarnessActivityDetails) => void | Promise<void>;
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

      console.log(HARNESS_LOG.MODEL_LOOP_STARTED(this.config.model, this.config.tools.length));
      await this.emitLifecycle('model_loop', `model loop started: ${this.config.model}`);

      while (loopCount < HARNESS_LIMITS.MAX_TOOL_CALLS) {
        loopCount++;

        console.log(HARNESS_LOG.TURN_WAITING(loopCount, HARNESS_LIMITS.MAX_TOOL_CALLS, this.config.model));
        await this.emitLifecycle('model_turn', `waiting for model turn ${loopCount}/${HARNESS_LIMITS.MAX_TOOL_CALLS}`);
        const response = await this.config.adapter.chat({
          model: this.config.model,
          messages,
          tools: this.config.tools,
          timeoutMs: HARNESS_LIMITS.CHAT_TIMEOUT_MS
        });

        this.tokenCounter.addUsage(response.tokenUsage.promptTokens, response.tokenUsage.completionTokens);
        messages.push(response.message);

        const usage = this.getContextUsage();
        const toolCalls = response.message.tool_calls;
        console.log(HARNESS_LOG.TURN_RECEIVED(loopCount, Math.round(usage.percent), toolCalls?.length || 0));
        await this.emitLifecycle('model_response', `received model turn ${loopCount}`, {
          tool_call_count: toolCalls?.length || 0,
          context_usage: usage,
        });

        if (usage.percent >= this.config.contextThreshold * 100) {
          console.warn(HARNESS_LOG.CONTEXT_THRESHOLD(Math.round(usage.percent)));
          await this.emitLifecycle('handover', `context threshold reached: ${Math.round(usage.percent)}%`, {
            context_usage: usage,
          });
          return await this.generateHandover(messages);
        }

        if (!toolCalls || toolCalls.length === 0) {
          consecutiveNoTools++;
          console.warn(HARNESS_LOG.NO_TOOL_CALL(loopCount, consecutiveNoTools, HARNESS_LIMITS.NO_TOOL_CALL_LIMIT));
          if (consecutiveNoTools >= HARNESS_LIMITS.NO_TOOL_CALL_LIMIT) {
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
            console.log(HARNESS_LOG.COMPLETE_TASK(this.config.checkpoint?.taskId || HARNESS_TEXT.UNKNOWN_TASK));
            await this.emitLifecycle('completion_signal', 'model requested complete_task');
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
            console.warn(HARNESS_LOG.TOOL_ARGUMENTS_INVALID(call.function.name, consecutiveMalformedJson, HARNESS_LIMITS.MALFORMED_JSON_LIMIT, err.message));
            if (consecutiveMalformedJson >= HARNESS_LIMITS.MALFORMED_JSON_LIMIT) {
              return this.errorResult(HARNESS_SUMMARY.MALFORMED_JSON, {
                error: HARNESS_TEXT.MALFORMED_JSON_ERROR,
                hypothesis: HARNESS_TEXT.MALFORMED_JSON_HYPOTHESIS,
                attempted_fix: HARNESS_TEXT.MALFORMED_JSON_ATTEMPTED_FIX
              });
            }
            hasError = true;
            toolErrorDiagnosis = HARNESS_TEXT.INVALID_JSON_ARGUMENTS(err.message);
            messages.push({
              role: ChatRole.TOOL,
              content: HARNESS_TEXT.TOOL_ERROR_WITH_FIX(toolErrorDiagnosis),
              name: call.function.name,
              tool_call_id: call.id
            });
            continue;
          }

          console.log(HARNESS_LOG.TOOL_START(call.function.name, formatToolCallPreview(call.function.name, args)));
          await this.emitLifecycle('tool', `starting ${call.function.name}`, {
            current_tool: call.function.name,
            current_file: this.resolveCurrentFile(args),
            context_usage: this.getContextUsage(),
          });
          const result = await this.config.toolExecutor.execute(call.function.name, args);

          if (result.error) {
            console.warn(HARNESS_LOG.TOOL_FAILED(call.function.name, truncateForLog(result.error, HARNESS_LIMITS.TOOL_ERROR_PREVIEW_LIMIT)));
            await this.emitLifecycle('tool', `failed ${call.function.name}: ${truncateForLog(result.error, HARNESS_LIMITS.TOOL_ERROR_PREVIEW_LIMIT)}`, {
              current_tool: call.function.name,
              current_file: this.resolveCurrentFile(args),
              context_usage: this.getContextUsage(),
            });
            if (result.error.startsWith('SCOPE_VIOLATION:')) {
              return this.errorResult(HARNESS_SUMMARY.SCOPE_VIOLATION, {
                error: result.error,
                hypothesis: HARNESS_TEXT.SCOPE_VIOLATION_HYPOTHESIS,
                attempted_fix: HARNESS_TEXT.SCOPE_VIOLATION_ATTEMPTED_FIX
              });
            }
            hasError = true;
            toolErrorDiagnosis = result.error;
          } else {
            console.log(HARNESS_LOG.TOOL_OK(call.function.name, result.output?.length || 0));
            await this.emitLifecycle('tool', `finished ${call.function.name}`, {
              current_tool: call.function.name,
              current_file: this.resolveCurrentFile(args),
              context_usage: this.getContextUsage(),
            });
          }

          messages.push({
            role: ChatRole.TOOL,
            content: result.error ? HARNESS_TEXT.TOOL_ERROR_CONTENT(result.error) : (result.output || HARNESS_TEXT.TOOL_SUCCESS),
            name: call.function.name,
            tool_call_id: call.id
          });
        }

        if (hasError) {
          reflexionCount++;
          console.warn(HARNESS_LOG.REFLEXION_RETRY(reflexionCount, HARNESS_LIMITS.REFLEXION_LIMIT));
          if (reflexionCount > HARNESS_LIMITS.REFLEXION_LIMIT) {
            return this.errorResult(HARNESS_SUMMARY.REFLEXION_FAILED(toolErrorDiagnosis), {
              error: toolErrorDiagnosis,
              hypothesis: HARNESS_TEXT.REFLEXION_HYPOTHESIS,
              attempted_fix: HARNESS_TEXT.REFLEXION_ATTEMPTED_FIX
            });
          }
          messages.push({
            role: ChatRole.USER,
            content: HARNESS_TEXT.TOOL_FAILURE_RETRY_PROMPT(HARNESS_LIMITS.REFLEXION_LIMIT + 1 - reflexionCount),
          });
        } else {
          reflexionCount = 0;
        }

          if (this.tokenCounter.shouldCheckpoint()) {
            console.warn(SYSTEM_MESSAGE.AGENT_TOKEN_CHECKPOINT);
            await this.emitLifecycle('checkpoint', 'context checkpoint written', {
              context_usage: this.getContextUsage(),
            });
            this.writeCheckpoint(hasError, toolErrorDiagnosis);
          }
      }

      return {
        status: HarnessStatus.MAX_ITERATIONS,
        summary: HARNESS_SUMMARY.MAX_TOOL_CALLS(HARNESS_LIMITS.MAX_TOOL_CALLS),
        tokenUsage: this.getContextUsage(),
        errorContext: {
          error: HARNESS_SUMMARY.MAX_TOOL_CALLS(HARNESS_LIMITS.MAX_TOOL_CALLS),
          hypothesis: HARNESS_TEXT.FATAL_HYPOTHESIS,
          attempted_fix: HARNESS_TEXT.ATTEMPTED_FIX_NONE
        }
      };
    } catch (err: any) {
      console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
      return this.errorResult(HARNESS_SUMMARY.FAILED(err.message), {
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

  private async emitLifecycle(phase: string, message: string, details?: HarnessActivityDetails): Promise<void> {
    if (!this.config.onLifecycle) return;
    try {
      await this.config.onLifecycle(phase, message, details);
    } catch {
      // Progress callbacks are visibility only. Terminal callback remains authoritative.
    }
  }

  private resolveCurrentFile(args: Record<string, unknown>): string | undefined {
    for (const key of ['path', 'file', 'target_file']) {
      const value = args[key];
      if (typeof value === 'string' && value.trim() !== '') return value;
    }
    return undefined;
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

    console.log(HARNESS_LOG.REQUESTING_HANDOVER(this.config.model));
    const response = await this.config.adapter.chat({
      model: this.config.model,
      messages,
      timeoutMs: HARNESS_LIMITS.CHAT_TIMEOUT_MS
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
      console.error(SYSTEM_MESSAGE.AGENT_ERROR, HARNESS_LOG.CHECKPOINT_WRITE_FAILED(e.message));
    }
  }
}
