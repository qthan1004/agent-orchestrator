import { SYSTEM_MESSAGE } from '../constants.js';
import { CALLBACK_TEXT, HARNESS_CALLBACK_STATUS, HARNESS_LIMITS } from './constants.js';
import type { HarnessActivityDetails, HarnessReadyStepResult, RuntimeBackendKind } from '../runtime/models.js';

export interface CompletionCallbackInput {
  workerId: string;
  taskId: string;
  runtimeId: string;
  leaseGeneration: number;
  status: (typeof HARNESS_CALLBACK_STATUS)[keyof typeof HARNESS_CALLBACK_STATUS];
  backend: RuntimeBackendKind;
  backendSessionId?: string;
  summary: string;
  success: boolean;
  errorContext?: unknown;
  changelog?: unknown;
}

export interface ReadyCallbackInput {
  workerId: string;
  taskId: string;
  runtimeId: string;
  leaseGeneration: number;
  backend: RuntimeBackendKind;
  backendSessionId?: string;
  ready: boolean;
  steps: HarnessReadyStepResult[];
  failedStep?: string;
  reason?: string;
}

export interface ProgressCallbackInput {
  workerId: string;
  taskId: string;
  runtimeId: string;
  leaseGeneration: number;
  backend: RuntimeBackendKind;
  phase: string;
  message: string;
  details?: HarnessActivityDetails;
}

interface CompletionCallbackResponse {
  accepted?: boolean;
  error?: string;
  [key: string]: unknown;
}

export class CallbackClient {
  private readonly readyUrl: string;
  private readonly progressUrl: string;

  constructor(
    private readonly callbackUrl: string,
    readyUrl?: string,
    progressUrl?: string
  ) {
    this.readyUrl = readyUrl ?? callbackUrl.replace(/\/complete$/, '/ready');
    this.progressUrl = progressUrl ?? callbackUrl.replace(/\/complete$/, '/progress');
  }

  public async complete(input: CompletionCallbackInput): Promise<void> {
    await this.postAndRequireAccepted(this.callbackUrl, {
      worker_id: input.workerId,
      task_id: input.taskId,
      runtime_id: input.runtimeId,
      lease_generation: input.leaseGeneration,
      status: input.status,
      backend: input.backend,
      backend_session_id: input.backendSessionId,
      summary: input.summary,
      success: input.success,
      error_context: input.errorContext,
      changelog: input.changelog
    }, CALLBACK_TEXT.REJECTED);
  }

  public async ready(input: ReadyCallbackInput): Promise<void> {
    await this.postAndRequireAccepted(this.readyUrl, {
      worker_id: input.workerId,
      task_id: input.taskId,
      runtime_id: input.runtimeId,
      lease_generation: input.leaseGeneration,
      backend: input.backend,
      backend_session_id: input.backendSessionId,
      ready: input.ready,
      steps: input.steps,
      failed_step: input.failedStep,
      reason: input.reason,
    }, CALLBACK_TEXT.READY_REJECTED);
  }

  public async progress(input: ProgressCallbackInput): Promise<void> {
    await this.postAndRequireAccepted(this.progressUrl, {
      worker_id: input.workerId,
      task_id: input.taskId,
      runtime_id: input.runtimeId,
      lease_generation: input.leaseGeneration,
      backend: input.backend,
      phase: input.phase,
      message: input.message,
      details: input.details,
    }, CALLBACK_TEXT.PROGRESS_REJECTED);
  }

  private async postAndRequireAccepted(url: string, body: Record<string, unknown>, rejectedText: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HARNESS_LIMITS.CALLBACK_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body)
      });

      clearTimeout(timeoutId);
      const responseText = await response.text();
      const responseBody = this.parseResponse(responseText);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${responseText || CALLBACK_TEXT.EMPTY_RESPONSE}`);
      }

      if (responseBody.accepted === false) {
        throw new Error(responseBody.error || responseText || rejectedText);
      }

      if (responseBody.accepted !== true) {
        throw new Error(responseBody.error || responseText || CALLBACK_TEXT.MISSING_ACCEPTED);
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
