import { SYSTEM_MESSAGE } from '../constants.js';

export interface CompletionCallbackInput {
  workerId: string;
  taskId: string;
  summary: string;
  success: boolean;
  errorContext?: unknown;
  changelog?: unknown;
}

interface CompletionCallbackResponse {
  accepted?: boolean;
  error?: string;
  [key: string]: unknown;
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

      const responseText = await response.text();
      const responseBody = this.parseResponse(responseText);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${responseText || 'empty response'}`);
      }

      if (responseBody.accepted === false) {
        throw new Error(responseBody.error || responseText || 'completion callback rejected');
      }
    } catch (err) {
      console.error(SYSTEM_MESSAGE.AGENT_NOTIFY_FAILED, err);
      throw err;
    }
  }

  private parseResponse(responseText: string): CompletionCallbackResponse {
    if (!responseText.trim()) return {};

    try {
      return JSON.parse(responseText) as CompletionCallbackResponse;
    } catch {
      return {};
    }
  }
}
