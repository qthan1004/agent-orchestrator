import { SYSTEM_MESSAGE } from '../constants.js';

const CALLBACK_TIMEOUT_MS = 30_000;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CALLBACK_TIMEOUT_MS);

    try {
      const response = await fetch(this.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          worker_id: input.workerId,
          task_id: input.taskId,
          summary: input.summary,
          success: input.success,
          error_context: input.errorContext,
          changelog: input.changelog
        })
      });

      clearTimeout(timeoutId);
      const responseText = await response.text();
      const responseBody = this.parseResponse(responseText);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${responseText || 'empty response'}`);
      }

      if (responseBody.accepted === false) {
        throw new Error(responseBody.error || responseText || 'completion callback rejected');
      }

      if (responseBody.accepted !== true) {
        throw new Error(responseBody.error || responseText || 'completion callback missing accepted=true');
      }
    } catch (err) {
      clearTimeout(timeoutId);
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
