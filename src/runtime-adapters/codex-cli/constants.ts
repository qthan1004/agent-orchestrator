export const CODEX_CLI_RUNTIME_DEFAULTS = {
  COMMAND: 'codex',
} as const;

export const CODEX_CLI_RUNTIME_LOG = {
  STDOUT: (runtimeId: string, line: string) => `[codex-cli runtime=${runtimeId}] ${line}`,
  STDERR: (runtimeId: string, line: string) => `[codex-cli runtime=${runtimeId} stderr] ${line}`,
} as const;
