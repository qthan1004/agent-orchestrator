import { createAdapter, ChatRole, ChatMessage, ToolDefinition } from './adapters/index.js';
import { ToolExecutor } from './tool-executor.js';
import { HarnessStatus, LLMHarness } from './llm-harness.js';
import { SYSTEM_MESSAGE } from '../constants.js';
import { PromptBuilder, PromptTask } from './prompt-builder.js';
import type { AssignmentEnvelope } from '../models/assignment.js';

/** Default LLM context window size in tokens. */
const DEFAULT_CONTEXT_LIMIT = 8192;

const RUNNER_TEXT = {
  ATTEMPTED_FIX_NONE: 'None',
  FATAL_HYPOTHESIS: 'Fatal exception in runner loop',
  CONTEXT_EXCEEDED_ERROR: 'context_exceeded',
  CONTEXT_EXCEEDED_HYPOTHESIS: 'Context window 85% full - handover generated'
} as const;

interface WorkerPayload {
  worker_id: string;
  task_id: string;
  task_details: string;
  assignment?: AssignmentEnvelope;
  target_files?: string[];
  workspace_root: string;
  server_url: string;
  allowed_tools: string[];
  model: string;
  action?: string;
  module?: string;
}

async function notifyComplete(serverUrl: string, workerId: string, taskId: string, summary: string, success: boolean, errorContext?: any, changelog?: any) {
  try {
    await fetch(`${serverUrl}/api/worker/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: workerId,
        task_id: taskId,
        summary,
        success,
        error_context: errorContext,
        changelog
      })
    });
  } catch (err) {
    console.error(SYSTEM_MESSAGE.AGENT_NOTIFY_FAILED, err);
  }
}

async function main() {
  let payload: WorkerPayload;
  
  try {
    let rawInput = '';
    for await (const chunk of process.stdin) {
      rawInput += chunk;
    }
    
    payload = JSON.parse(rawInput);
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_PARSE_FAILED, err.message);
    process.exit(1);
  }

  const { worker_id, task_id, task_details, assignment, target_files = [], workspace_root, server_url, allowed_tools, model, action = 'implement', module = '' } = payload;

  const adapter = createAdapter({ adapter: 'ollama' });
  const toolExecutor = new ToolExecutor(workspace_root, allowed_tools, target_files);
  const promptBuilder = new PromptBuilder();

  const promptTask: PromptTask = {
    id: task_id,
    action,
    module,
    workspaceRoot: workspace_root
  };
  const systemPromptContent = await promptBuilder.buildPrompt(promptTask);

  const messages: ChatMessage[] = [
    { role: ChatRole.SYSTEM, content: systemPromptContent },
    {
      role: ChatRole.USER,
      content: assignment
        ? [
            'Assigned task from orchestrator.',
            `Worker ID: ${assignment.worker_id}`,
            `Task ID: ${assignment.task_id}`,
            `Workspace ID: ${assignment.workspace.workspace_id}`,
            `Workspace Path: ${assignment.workspace.workspace_path}`,
            'Rules:',
            '- Execute only the assigned task payload.',
            '- Do not self-select another task.',
            '- Respect target_files scope when writing.',
            '',
            task_details
          ].join('\n')
        : task_details
    }
  ];

  // Dummy tool definitions based on allowed_tools to satisfy Ollama
  const tools: ToolDefinition[] = allowed_tools.map(t => ({
    type: 'function',
    function: {
      name: t,
      description: `Tool: ${t}`,
      parameters: { type: 'object', properties: { args: { type: 'string' } } }
    }
  }));

  tools.push({
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark the task as complete. Call this when you have finished all required steps.',
      parameters: { 
        type: 'object', 
        properties: { 
          summary: { type: 'string', description: 'Summary of what was done' },
          changelog: {
            type: 'object',
            description: 'Structured changelog of the work done',
            properties: {
              files_touched: { type: 'array', items: { type: 'string' } },
              lines_added: { type: 'number' },
              lines_removed: { type: 'number' },
              logic_description: { type: 'string' }
            },
            required: ['files_touched', 'lines_added', 'lines_removed', 'logic_description']
          }
        }, 
        required: ['summary', 'changelog'] 
      }
    }
  });

  try {
    const harness = new LLMHarness({
      adapter,
      model,
      contextLimit: DEFAULT_CONTEXT_LIMIT,
      contextThreshold: 0.85,
      tools,
      toolExecutor,
      checkpoint: {
        workspaceRoot: workspace_root,
        taskId: task_id
      }
    });

    const result = await harness.run(messages);
    if (result.status === HarnessStatus.COMPLETE) {
      await notifyComplete(server_url, worker_id, task_id, result.summary, true, undefined, result.changelog);
      process.exit(0);
    }

    if (result.status === HarnessStatus.CONTEXT_EXCEEDED) {
      await notifyComplete(server_url, worker_id, task_id, result.summary, false, {
        error: RUNNER_TEXT.CONTEXT_EXCEEDED_ERROR,
        hypothesis: RUNNER_TEXT.CONTEXT_EXCEEDED_HYPOTHESIS,
        attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE,
        handover: result.handover
      });
      process.exit(1);
    }

    await notifyComplete(server_url, worker_id, task_id, result.summary, false, result.errorContext);
    process.exit(1);
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
    await notifyComplete(server_url, worker_id, task_id, `Failed: ${err.message}`, false, {
      error: err.message,
      hypothesis: RUNNER_TEXT.FATAL_HYPOTHESIS,
      attempted_fix: RUNNER_TEXT.ATTEMPTED_FIX_NONE
    });
    process.exit(1);
  }
}

main();
