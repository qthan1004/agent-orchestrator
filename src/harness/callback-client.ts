import { SYSTEM_MESSAGE } from '../constants.js';

export interface CompletionCallbackInput {
  workerId: string;
  taskId: string;
  summary: string;
  success: boolean;
  errorContext?: unknown;
  changelog?: unknown;
}

export class CallbackClient {
  constructor(private readonly callbackUrl: string) {}

  public async complete(input: CompletionCallbackInput): Promise<void> {
    try {
      const response = await fetch(this.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: input.workerId,
          task_id: input.taskId,
          summary: input.summary,
          success: input.success,
          error_context: input.errorContext,
          changelog: input.changelog
        })
      });

      if (!response.ok) {
        console.error(SYSTEM_MESSAGE.AGENT_NOTIFY_FAILED, `${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error(SYSTEM_MESSAGE.AGENT_NOTIFY_FAILED, err);
    }
  }
}
