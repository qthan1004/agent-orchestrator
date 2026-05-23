export const AG_CLI_RUNTIME_DEFAULTS = {
  COMMAND: 'ag',
} as const;

export const AG_CLI_RUNTIME_LOG = {
  STDOUT: (runtimeId: string, line: string) => `[ag-cli runtime=${runtimeId}] ${line}`,
  STDERR: (runtimeId: string, line: string) => `[ag-cli runtime=${runtimeId} stderr] ${line}`,
} as const;
