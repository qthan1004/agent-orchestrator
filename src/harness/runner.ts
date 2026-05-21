import { ChatMessage, ChatRole, createAdapter } from '../worker/adapters/index.js';
import { PromptBuilder, PromptTask } from '../worker/prompt-builder.js';
import { ToolExecutor } from '../worker/tool-executor.js';
import { CallbackClient } from './callback-client.js';
import type { HarnessPayload } from './payload.js';
import { WorkspaceLoader, type LoadedStaticFile, type LoadedWorkspaceContext } from './workspace-loader.js';
import { buildToolDefinitions, resolveToolNames } from './tool-registry.js';
import { HarnessStatus, LLMHarness } from './model-loop.js';
import { SYSTEM_MESSAGE } from '../constants.js';

/** Default LLM context window size in tokens. */
const DEFAULT_CONTEXT_LIMIT = 8192;

const RUNNER_TEXT = {
  ATTEMPTED_FIX_NONE: 'None',
  FATAL_HYPOTHESIS: 'Fatal exception in harness runner',
  CONTEXT_EXCEEDED_ERROR: 'context_exceeded',
  CONTEXT_EXCEEDED_HYPOTHESIS: 'Context window 85% full - handover generated'
} as const;

function formatStaticFiles(title: string, files: LoadedStaticFile[]): string {
  if (files.length === 0) return '';

  const sections = files.map(file => [
    `### ${file.path}`,
    file.content
  ].join('\n'));

  return [`## ${title}`, ...sections].join('\n\n');
}

function buildUserMessage(payload: HarnessPayload, loaded: LoadedWorkspaceContext): string {
  const parts = [
    'Assigned task from orchestrator harness.',
    `Worker ID: ${payload.worker_id}`,
    `Task ID: ${payload.task_id}`,
    `Workspace ID: ${payload.workspace_id}`,
    `Workspace Path: ${payload.workspace_root}`,
    payload.task_file_path ? `Task File Path: ${payload.task_file_path}` : '',
    'Rules:',
    '- Execute only the assigned task payload.',
    '- Do not self-select another task.',
    '- Respect target_files scope when writing.',
    ''
  ].filter(Boolean);

  if (payload.assignment) {
    parts.push('## Assignment Envelope');
    parts.push(JSON.stringify(payload.assignment, null, 2));
    parts.push('');
  }

  if (payload.handover_context) {
    parts.push('## Handover from Previous Worker');
    parts.push(payload.handover_context);
    parts.push('');
  }

  parts.push('## Assigned Task Body');
  parts.push(loaded.taskBody);

  const skillContent = formatStaticFiles('Loaded Skills', loaded.skillFiles);
  if (skillContent) parts.push(skillContent);

  const contextContent = formatStaticFiles('Loaded Context', loaded.contextFiles);
  if (contextContent) parts.push(contextContent);

  return parts.join('\n');
}

export async function executeHarness(payload: HarnessPayload): Promise<number> {
  const callbackClient = new CallbackClient(payload.callback_url);

  try {
    const loader = new WorkspaceLoader(payload.workspace_root);
    const loaded = await loader.load(payload);
    const toolNames = resolveToolNames(payload.tool_bundle, payload.allowed_tools);
    const toolExecutor = new ToolExecutor(payload.workspace_root, toolNames, payload.target_files);
    const promptBuilder = new PromptBuilder();

    const promptTask: PromptTask = {
      id: payload.task_id,
      action: payload.action,
      module: payload.module,
      workspaceRoot: payload.workspace_root
    };

    const messages: ChatMessage[] = [
      { role: ChatRole.SYSTEM, content: await promptBuilder.buildPrompt(promptTask) },
      { role: ChatRole.USER, content: buildUserMessage(payload, loaded) }
    ];

    const harness = new LLMHarness({
      adapter: createAdapter({ adapter: 'ollama' }),
      model: payload.model,
      contextLimit: DEFAULT_CONTEXT_LIMIT,
      contextThreshold: 0.85,
      tools: buildToolDefinitions(toolNames),
      toolExecutor,
      checkpoint: {
        workspaceRoot: payload.workspace_root,
        taskId: payload.task_id
      }
    });

    const result = await harness.run(messages);
    if (result.status === HarnessStatus.COMPLETE) {
      await callbackClient.complete({
        workerId: payload.worker_id,
        taskId: payload.task_id,
        summary: result.summary,
        success: true,
        changelog: result.changelog
      });
      return 0;
    }

    if (result.status === HarnessStatus.CONTEXT_EXCEEDED) {
      await callbackClient.complete({
        workerId: payload.worker_id,
        taskId: payload.task_id,
        summary: result.summary,
        success: false,
        errorContext: {
          error: RUNNER_TEXT.CONTEXT_EXCEEDED_ERROR,
          hypothesis: RUNNER_TEXT.CONTEXT_EXCEEDED_HYPOTHESIS,
          attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE,
          handover: result.handover
        }
      });
      return 1;
    }

    await callbackClient.complete({
      workerId: payload.worker_id,
      taskId: payload.task_id,
      summary: result.summary,
      success: false,
      errorContext: result.errorContext
    });
    return 1;
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
    await callbackClient.complete({
      workerId: payload.worker_id,
      taskId: payload.task_id,
      summary: `Failed: ${err.message}`,
      success: false,
      errorContext: {
        error: err.message,
        hypothesis: RUNNER_TEXT.FATAL_HYPOTHESIS,
        attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE
      }
    });
    return 1;
  }
}
