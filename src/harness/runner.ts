import { ChatMessage, ChatRole, createAdapter } from '../worker/adapters/index.js';
import { PromptBuilder, PromptTask } from '../worker/prompt-builder.js';
import { ToolExecutor } from '../worker/tool-executor.js';
import { CallbackClient } from './callback-client.js';
import type { HarnessPayload } from './payload.js';
import { WorkspaceLoader, type LoadedStaticFile, type LoadedWorkspaceContext } from './workspace-loader.js';
import { buildToolDefinitions, resolveToolNames } from './tool-registry.js';
import { HarnessStatus, LLMHarness } from './model-loop.js';
import { SYSTEM_MESSAGE } from '../constants.js';
import { HARNESS_LIMITS, HARNESS_SUMMARY, RUNNER_LOG, RUNNER_TEXT } from './constants.js';

function formatStaticFiles(title: string, files: LoadedStaticFile[]): string {
  if (files.length === 0) return '';

  const sections = files.map(file => [
    RUNNER_TEXT.STATIC_FILE_HEADER(file.path),
    file.content
  ].join('\n'));

  return [RUNNER_TEXT.STATIC_TITLE(title), ...sections].join('\n\n');
}

function buildUserMessage(payload: HarnessPayload, loaded: LoadedWorkspaceContext): string {
  const parts = [
    RUNNER_TEXT.USER_MESSAGE_INTRO,
    `Worker ID: ${payload.worker_id}`,
    `Task ID: ${payload.task_id}`,
    `Workspace ID: ${payload.workspace_id}`,
    `Workspace Path: ${payload.workspace_root}`,
    payload.task_file_path ? `Task File Path: ${payload.task_file_path}` : '',
    RUNNER_TEXT.USER_MESSAGE_RULES,
    RUNNER_TEXT.USER_MESSAGE_RULE_ASSIGNED,
    RUNNER_TEXT.USER_MESSAGE_RULE_SELF_SELECT,
    RUNNER_TEXT.USER_MESSAGE_RULE_SCOPE,
    ''
  ].filter(Boolean);

  if (payload.assignment) {
    parts.push(RUNNER_TEXT.ASSIGNMENT_ENVELOPE);
    parts.push(JSON.stringify(payload.assignment, null, 2));
    parts.push('');
  }

  if (payload.handover_context) {
    parts.push(RUNNER_TEXT.HANDOVER_FROM_PREVIOUS_WORKER);
    parts.push(typeof payload.handover_context === 'string'
      ? payload.handover_context
      : JSON.stringify(payload.handover_context, null, 2));
    parts.push('');
  }

  parts.push(RUNNER_TEXT.ASSIGNED_TASK_BODY);
  parts.push(loaded.taskBody);

  const skillContent = formatStaticFiles(RUNNER_TEXT.LOADED_SKILLS, loaded.skillFiles);
  if (skillContent) parts.push(skillContent);

  const contextContent = formatStaticFiles(RUNNER_TEXT.LOADED_CONTEXT, loaded.contextFiles);
  if (contextContent) parts.push(contextContent);

  return parts.join('\n');
}

export async function executeHarness(payload: HarnessPayload): Promise<number> {
  const callbackClient = new CallbackClient(payload.callback_url);

  try {
    console.log(RUNNER_LOG.STARTING_TASK(payload.task_id, payload.workspace_id));
    console.log(RUNNER_LOG.MODEL_SELECTED(payload.model, payload.tool_bundle));

    const loader = new WorkspaceLoader(payload.workspace_root);
    const loaded = await loader.load(payload);
    const toolNames = resolveToolNames(payload.tool_bundle, payload.allowed_tools);
    const toolExecutor = new ToolExecutor(payload.workspace_root, toolNames, payload.target_files);
    const promptBuilder = new PromptBuilder();
    console.log(RUNNER_LOG.LOADED_TASK(loaded.taskBody.length, loaded.skillFiles.length, loaded.contextFiles.length));
    console.log(RUNNER_LOG.TOOLS_ENABLED(toolNames.join(', ') || RUNNER_TEXT.NO_TOOLS));

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
      adapter: createAdapter({ adapter: 'ollama', baseUrl: payload.ollama_base_url || process.env.OLLAMA_BASE_URL }),
      model: payload.model,
      contextLimit: HARNESS_LIMITS.DEFAULT_CONTEXT_LIMIT,
      contextThreshold: HARNESS_LIMITS.DEFAULT_CONTEXT_THRESHOLD,
      tools: buildToolDefinitions(toolNames),
      toolExecutor,
      checkpoint: {
        workspaceRoot: payload.workspace_root,
        taskId: payload.task_id
      }
    });

    console.log(RUNNER_LOG.PROMPT_READY(payload.task_id));
    const result = await harness.run(messages);
    console.log(RUNNER_LOG.MODEL_LOOP_ENDED(result.status, result.summary));

    if (result.status === HarnessStatus.COMPLETE) {
      console.log(RUNNER_LOG.NOTIFYING_SERVER('success', payload.task_id));
      await callbackClient.complete({
        workerId: payload.worker_id,
        taskId: payload.task_id,
        runtimeId: payload.runtime_id,
        leaseGeneration: payload.lease_generation,
        summary: result.summary,
        success: true,
        changelog: result.changelog
      });
      console.log(RUNNER_LOG.SERVER_ACCEPTED('completion', payload.task_id));
      return 0;
    }

    if (result.status === HarnessStatus.CONTEXT_EXCEEDED) {
      console.log(RUNNER_LOG.NOTIFYING_SERVER('handover', payload.task_id));
      await callbackClient.complete({
        workerId: payload.worker_id,
        taskId: payload.task_id,
        runtimeId: payload.runtime_id,
        leaseGeneration: payload.lease_generation,
        summary: result.summary,
        success: false,
        errorContext: {
          error: RUNNER_TEXT.CONTEXT_EXCEEDED_ERROR,
          hypothesis: RUNNER_TEXT.CONTEXT_EXCEEDED_HYPOTHESIS,
          attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE,
          handover: {
            task_id: payload.task_id,
            worker_id: payload.worker_id,
            runtime_id: payload.runtime_id,
            lease_generation: payload.lease_generation,
            attempt: payload.lease_generation,
            order: payload.lease_generation,
            summary: result.summary,
            open_questions: [],
            modified_files: [],
            next_action: result.handover || '',
            content: result.handover || '',
            created_at: new Date().toISOString(),
          }
        }
      });
      console.log(RUNNER_LOG.SERVER_ACCEPTED('handover', payload.task_id));
      return 1;
    }

    console.log(RUNNER_LOG.NOTIFYING_SERVER('failure', payload.task_id));
    await callbackClient.complete({
      workerId: payload.worker_id,
      taskId: payload.task_id,
      runtimeId: payload.runtime_id,
      leaseGeneration: payload.lease_generation,
      summary: result.summary,
      success: false,
      errorContext: result.errorContext
    });
    console.log(RUNNER_LOG.SERVER_ACCEPTED('failure', payload.task_id));
    return 1;
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
    try {
      console.log(RUNNER_LOG.NOTIFYING_SERVER('fatal failure', payload.task_id));
      await callbackClient.complete({
        workerId: payload.worker_id,
        taskId: payload.task_id,
        runtimeId: payload.runtime_id,
        leaseGeneration: payload.lease_generation,
        summary: HARNESS_SUMMARY.FAILED(err.message),
        success: false,
        errorContext: {
          error: err.message,
          hypothesis: RUNNER_TEXT.FATAL_HYPOTHESIS,
          attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE
        }
      });
      console.log(RUNNER_LOG.SERVER_ACCEPTED('fatal failure', payload.task_id));
    } catch {
      // The dispatch loop will treat process exit without accepted callback as failure.
    }
    return 1;
  }
}
