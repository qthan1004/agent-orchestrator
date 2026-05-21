import type { ToolDefinition } from '../worker/adapters/index.js';

const GENERIC_FILE_TOOLS = [
  'view_file',
  'list_dir',
  'write_to_file',
  'replace_file_content',
  'run_command'
] as const;

const TOOL_BUNDLES: Record<string, readonly string[]> = {
  'generic-file': GENERIC_FILE_TOOLS
};

function schemaForTool(toolName: string): Record<string, unknown> {
  switch (toolName) {
    case 'view_file':
      return {
        type: 'object',
        properties: {
          path: { type: 'string' },
          start_line: { type: 'number' },
          end_line: { type: 'number' }
        },
        required: ['path']
      };
    case 'list_dir':
      return {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      };
    case 'write_to_file':
      return {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      };
    case 'replace_file_content':
      return {
        type: 'object',
        properties: {
          path: { type: 'string' },
          target: { type: 'string' },
          replacement: { type: 'string' }
        },
        required: ['path', 'target', 'replacement']
      };
    case 'run_command':
      return {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string' }
        },
        required: ['command']
      };
    default:
      return { type: 'object', properties: {} };
  }
}

export function resolveToolNames(toolBundle: string, allowedTools: string[]): string[] {
  const bundleTools = TOOL_BUNDLES[toolBundle] || TOOL_BUNDLES['generic-file'];
  if (allowedTools.length === 0 || allowedTools.includes('*')) {
    return [...bundleTools];
  }

  const allowed = new Set(allowedTools);
  return bundleTools.filter(toolName => allowed.has(toolName));
}

export function buildToolDefinitions(toolNames: string[]): ToolDefinition[] {
  const toolDefinitions: ToolDefinition[] = toolNames.map(toolName => ({
    type: 'function',
    function: {
      name: toolName,
      description: `Harness tool: ${toolName}`,
      parameters: schemaForTool(toolName)
    }
  }));

  toolDefinitions.push({
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

  return toolDefinitions;
}
