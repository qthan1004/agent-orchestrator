export const HARNESS_LIMITS = {
  MAX_TOOL_CALLS: 50,
  CHAT_TIMEOUT_MS: 5 * 60 * 1000,
  TOOL_PREVIEW_LIMIT: 160,
  TOOL_ERROR_PREVIEW_LIMIT: 240,
  NO_TOOL_CALL_LIMIT: 3,
  MALFORMED_JSON_LIMIT: 3,
  REFLEXION_LIMIT: 2,
  DEFAULT_CONTEXT_LIMIT: 8192,
  DEFAULT_CONTEXT_THRESHOLD: 0.85,
  CALLBACK_TIMEOUT_MS: 30_000,
} as const;

export const HARNESS_STATUS = {
  COMPLETE: 'complete',
  CONTEXT_EXCEEDED: 'context_exceeded',
  ERROR: 'error',
  MAX_ITERATIONS: 'max_iterations',
} as const;

export const HARNESS_SUMMARY = {
  DEFAULT_COMPLETE: 'Task completed',
  NO_TOOL_CALLS: 'Failed: No tool calls for 3 consecutive turns',
  MALFORMED_JSON: 'Failed: Malformed JSON 3 times',
  SCOPE_VIOLATION: 'scope_violation',
  CONTEXT_HANDOVER: 'Context {percent}% - handover generated',
  MAX_TOOL_CALLS: (maxToolCalls: number) => `Failed: Max tool calls (${maxToolCalls}) exceeded`,
  FAILED: (message: string) => `Failed: ${message}`,
  REFLEXION_FAILED: (diagnosis: string) => `Reflexion failed: ${diagnosis}`,
} as const;

export const HANDOVER_PROMPT = [
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
  'DO NOT call any tools. Write text report only.',
] as const;

export const HARNESS_TEXT = {
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
  TOKEN_CHECKPOINT_HYPOTHESIS: 'Token limit checkpoint hit during error',
  TOOL_SUCCESS: 'Success',
  UNKNOWN_TASK: 'unknown task',
  INVALID_JSON_ARGUMENTS: (message: string) => `Invalid JSON arguments: ${message}`,
  TOOL_ERROR_CONTENT: (message: string) => `Error: ${message}`,
  TOOL_ERROR_WITH_FIX: (message: string) => `Error: ${message}. Please fix the JSON formatting.`,
  TOOL_FAILURE_RETRY_PROMPT: (remainingAttempts: number) =>
    `Tool execution failed. Diagnose the error and try a different approach. You have ${remainingAttempts} attempts left before aborting.`,
} as const;

export const HARNESS_LOG = {
  MODEL_LOOP_STARTED: (model: string, toolCount: number) => `[Harness] Model loop started: model=${model}, tools=${toolCount}.`,
  TURN_WAITING: (turn: number, maxTurns: number, model: string) => `[Harness] Turn ${turn}/${maxTurns}: waiting for model response (${model}).`,
  TURN_RECEIVED: (turn: number, contextPercent: number, toolCalls: number) => `[Harness] Turn ${turn}: response received, context=${contextPercent}%, tool_calls=${toolCalls}.`,
  CONTEXT_THRESHOLD: (contextPercent: number) => `[Harness] Context threshold reached (${contextPercent}%). Generating handover.`,
  NO_TOOL_CALL: (turn: number, count: number, limit: number) => `[Harness] Turn ${turn}: no tool call (${count}/${limit}).`,
  COMPLETE_TASK: (taskId: string) => `[Harness] complete_task requested by model for ${taskId}.`,
  TOOL_ARGUMENTS_INVALID: (tool: string, count: number, limit: number, message: string) => `[Harness] Tool ${tool} arguments invalid (${count}/${limit}): ${message}`,
  TOOL_START: (tool: string, preview: string) => `[Harness] Tool ${tool} start${preview}.`,
  TOOL_FAILED: (tool: string, message: string) => `[Harness] Tool ${tool} failed: ${message}`,
  TOOL_OK: (tool: string, outputLength: number) => `[Harness] Tool ${tool} ok (${outputLength} chars).`,
  REFLEXION_RETRY: (count: number, limit: number) => `[Harness] Reflexion retry ${count}/${limit} after tool failure.`,
  REQUESTING_HANDOVER: (model: string) => `[Harness] Requesting handover from model (${model}).`,
  CHECKPOINT_WRITE_FAILED: (message: string) => `Failed to write checkpoint: ${message}`,
} as const;

export const RUNNER_TEXT = {
  ATTEMPTED_FIX_NONE: 'None',
  FATAL_HYPOTHESIS: 'Fatal exception in harness runner',
  CONTEXT_EXCEEDED_ERROR: 'context_exceeded',
  CONTEXT_EXCEEDED_HYPOTHESIS: 'Context window 85% full - handover generated',
  STATIC_TITLE: (title: string) => `## ${title}`,
  STATIC_FILE_HEADER: (path: string) => `### ${path}`,
  USER_MESSAGE_INTRO: 'Assigned task from orchestrator harness.',
  USER_MESSAGE_RULES: 'Rules:',
  USER_MESSAGE_RULE_ASSIGNED: '- Execute only the assigned task payload.',
  USER_MESSAGE_RULE_SELF_SELECT: '- Do not self-select another task.',
  USER_MESSAGE_RULE_SCOPE: '- Respect target_files scope when writing.',
  ASSIGNMENT_ENVELOPE: '## Assignment Envelope',
  HANDOVER_FROM_PREVIOUS_WORKER: '## Handover from Previous Worker',
  ASSIGNED_TASK_BODY: '## Assigned Task Body',
  LOADED_SKILLS: 'Loaded Skills',
  LOADED_CONTEXT: 'Loaded Context',
  NO_TOOLS: 'none',
} as const;

export const RUNNER_LOG = {
  STARTING_TASK: (taskId: string, workspaceId: string) => `[Harness] Starting task ${taskId} in workspace ${workspaceId}.`,
  MODEL_SELECTED: (model: string, toolBundle: string) => `[Harness] Model=${model}, tool_bundle=${toolBundle}.`,
  LOADED_TASK: (taskLength: number, skillCount: number, contextCount: number) => `[Harness] Loaded task body (${taskLength} chars), skills=${skillCount}, context=${contextCount}.`,
  TOOLS_ENABLED: (tools: string) => `[Harness] Tools enabled: ${tools}.`,
  PROMPT_READY: (taskId: string) => `[Harness] Prompt ready. Entering model loop for task ${taskId}.`,
  MODEL_LOOP_ENDED: (status: string, summary: string) => `[Harness] Model loop ended with status=${status}, summary=${summary}.`,
  NOTIFYING_SERVER: (status: string, taskId: string) => `[Harness] Notifying server: ${status} for ${taskId}.`,
  SERVER_ACCEPTED: (status: string, taskId: string) => `[Harness] Server accepted ${status} for ${taskId}.`,
} as const;

export const CALLBACK_TEXT = {
  EMPTY_RESPONSE: 'empty response',
  REJECTED: 'completion callback rejected',
  MISSING_ACCEPTED: 'completion callback missing accepted=true',
} as const;

export const PAYLOAD_TEXT = {
  OBJECT_REQUIRED: (field: string) => `${field} must be an object.`,
  STRING_REQUIRED: (field: string) => `${field} must be a non-empty string.`,
  CALLBACK_URL_REQUIRED: 'callback_url must be provided.',
  WORKSPACE_ID_REQUIRED: 'workspace_id must be provided.',
  RUNTIME_ID_REQUIRED: 'runtime_id must be provided.',
  LEASE_GENERATION_REQUIRED: 'lease_generation must be provided.',
  TASK_FILE_REQUIRED: 'task_file_path must be provided unless legacy task_details is present.',
} as const;

export const WORKSPACE_LOADER_TEXT = {
  EMPTY_TASK_BODY: 'Assigned task body is empty.',
  ORCHESTRATOR_TASK_FILE: '.orchestrator task file',
  TASK_CONTENT_FILE: 'task content file',
  FILE_LABEL: (kind: 'skills' | 'context') => `${kind} file`,
  UNDER_ORCHESTRATOR: (label: string) => `${label} must be under .orchestrator`,
  RELATIVE_REQUIRED: (label: string) => `${label} must be relative to workspace root.`,
  ESCAPES_WORKSPACE: (label: string) => `${label} escapes workspace root`,
} as const;
