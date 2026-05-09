import { createAdapter, ChatRole, ChatMessage, ToolDefinition } from './adapters/index.js';
import { ToolExecutor } from './tool-executor.js';
import { TokenCounter } from './token-counter.js';
import { SYSTEM_MESSAGE } from '../constants.js';
import { PromptBuilder, PromptTask } from './prompt-builder.js';
import fs from 'fs';
import path from 'path';
import { UnifiedCheckpoint } from '../models/checkpoint.js';

/** Default LLM context window size in tokens. */
const DEFAULT_CONTEXT_LIMIT = 8192;

/** Maximum number of tool-call loop iterations before aborting. */
const MAX_TOOL_CALLS = 50;

interface WorkerPayload {
  worker_id: string;
  task_id: string;
  task_details: string;
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

  const { worker_id, task_id, task_details, workspace_root, server_url, allowed_tools, model, action = 'implement', module = '' } = payload;

  const adapter = createAdapter({ adapter: 'ollama' });
  const toolExecutor = new ToolExecutor(workspace_root, allowed_tools);
  const tokenCounter = new TokenCounter(DEFAULT_CONTEXT_LIMIT);
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
    { role: ChatRole.USER, content: task_details }
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
    let loopCount = 0;
    let consecutiveNoTools = 0;
    let consecutiveMalformedJson = 0;
    let reflexionCount = 0;

    while (loopCount < MAX_TOOL_CALLS) {
      loopCount++;

      const response = await adapter.chat({
        model,
        messages,
        tools
      });

      tokenCounter.addUsage(response.tokenUsage.promptTokens, response.tokenUsage.completionTokens);
      messages.push(response.message);

      const toolCalls = response.message.tool_calls;
      
      if (!toolCalls || toolCalls.length === 0) {
        consecutiveNoTools++;
        if (consecutiveNoTools >= 3) {
          await notifyComplete(server_url, worker_id, task_id, `Failed: No tool calls for 3 consecutive turns`, false, { 
            error: 'No tool calls', hypothesis: 'LLM failed to output tool calls 3 times', attempted_fix: 'None' 
          });
          process.exit(1);
        }
        messages.push({ role: ChatRole.USER, content: "You did not call any tools. You must use a tool to progress. If the task is done, use the 'complete_task' tool." });
        continue;
      }
      consecutiveNoTools = 0;

      let hasError = false;
      let toolErrorDiagnosis = '';

      // Execute tool calls
      for (const call of toolCalls) {
        if (call.function.name === 'complete_task') {
          let summary = 'Task completed';
          let changelog: any = undefined;
          try {
            const args = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
            summary = args.summary || summary;
            changelog = args.changelog;
          } catch(e) {}
          await notifyComplete(server_url, worker_id, task_id, summary, true, undefined, changelog);
          process.exit(0);
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
            await notifyComplete(server_url, worker_id, task_id, `Failed: Malformed JSON 3 times`, false, { 
              error: 'Malformed JSON', hypothesis: 'LLM consistently fails to format JSON correctly', attempted_fix: 'Retried 3 times' 
            });
            process.exit(1);
          }
          hasError = true;
          toolErrorDiagnosis = `Invalid JSON arguments: ${err.message}`;
          messages.push({
            role: ChatRole.TOOL,
            content: `Error: ${toolErrorDiagnosis}. Please fix the JSON formatting.`,
            name: call.function.name,
            tool_call_id: call.id
          });
          continue;
        }
          
        const result = await toolExecutor.execute(call.function.name, args as Record<string, unknown>);
        
        if (result.error) {
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
           await notifyComplete(server_url, worker_id, task_id, `Reflexion failed: ${toolErrorDiagnosis}`, false, { 
             error: toolErrorDiagnosis, 
             hypothesis: 'Tools kept failing despite retries', 
             attempted_fix: 'Reflexion loop maxed out at 2' 
           });
           process.exit(1);
        }
        messages.push({ role: ChatRole.USER, content: `Tool execution failed. Diagnose the error and try a different approach. You have ${3 - reflexionCount} attempts left before aborting.` });
      } else {
        reflexionCount = 0;
      }

      if (tokenCounter.shouldCheckpoint()) {
        console.warn(SYSTEM_MESSAGE.AGENT_TOKEN_CHECKPOINT);
        try {
          const cpPath = path.join(workspace_root, '.agent', 'session.json');
          const cpData: UnifiedCheckpoint & { version: number; created_at: string; updated_at: string } = {
            version: 3,
            task_id,
            phase: 'implementation',
            files_changed: [],
            completed_steps: [],
            remaining_steps: [],
            error_context: hasError ? { 
              error: toolErrorDiagnosis, 
              hypothesis: 'Token limit checkpoint hit during error', 
              attempted_fix: 'None' 
            } : null,
            token_usage: {
              used: tokenCounter.getUsage().used,
              limit: tokenCounter.getUsage().limit
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

    throw new Error(`Max tool calls (${MAX_TOOL_CALLS}) exceeded`);

  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_ERROR, err.message);
    await notifyComplete(server_url, worker_id, task_id, `Failed: ${err.message}`, false, { 
      error: err.message, hypothesis: 'Fatal exception in runner loop', attempted_fix: 'None' 
    });
    process.exit(1);
  }
}

main();
