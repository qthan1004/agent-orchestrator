import { createAdapter, ChatRole, ChatMessage, ToolDefinition } from './adapters/index.js';
import { ToolExecutor } from './tool-executor.js';
import { TokenCounter } from './token-counter.js';

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
}

async function notifyComplete(serverUrl: string, workerId: string, taskId: string, summary: string, success: boolean) {
  try {
    await fetch(`${serverUrl}/api/worker/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: workerId,
        task_id: taskId,
        summary,
        success
      })
    });
  } catch (err) {
    console.error('Failed to notify server:', err);
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
    console.error('Failed to parse stdin payload:', err.message);
    process.exit(1);
  }

  const { worker_id, task_id, task_details, workspace_root, server_url, allowed_tools, model } = payload;

  const adapter = createAdapter({ adapter: 'ollama' });
  const toolExecutor = new ToolExecutor(workspace_root, allowed_tools);
  const tokenCounter = new TokenCounter(DEFAULT_CONTEXT_LIMIT);

  const messages: ChatMessage[] = [
    { role: ChatRole.SYSTEM, content: "You are an AI assistant. You must complete the given task." },
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

  try {
    let loopCount = 0;
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
        // Final answer
        await notifyComplete(server_url, worker_id, task_id, response.message.content || 'Task completed', true);
        process.exit(0);
      }

      // Execute tool calls
      for (const call of toolCalls) {
        const args = typeof call.function.arguments === 'string' 
          ? JSON.parse(call.function.arguments) 
          : call.function.arguments;
          
        const result = await toolExecutor.execute(call.function.name, args as Record<string, unknown>);
        
        messages.push({
          role: ChatRole.TOOL,
          content: result.error ? `Error: ${result.error}` : (result.output || 'Success'),
          name: call.function.name,
          tool_call_id: call.id
        });
      }

      if (tokenCounter.shouldCheckpoint()) {
        console.warn('Token checkpoint reached (80%)');
        // Token checkpoint logic can be added here
      }
    }

    throw new Error(`Max tool calls (${MAX_TOOL_CALLS}) exceeded`);

  } catch (err: any) {
    console.error('Agent runner error:', err.message);
    await notifyComplete(server_url, worker_id, task_id, `Failed: ${err.message}`, false);
    process.exit(1);
  }
}

main();
