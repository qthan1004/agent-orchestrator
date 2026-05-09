/** Fraction of context limit at which a checkpoint should be triggered. */
const CHECKPOINT_THRESHOLD = 0.8;

/**
 * Tracks cumulative token usage per worker session and signals
 * when usage approaches the model's context limit.
 */
export class TokenCounter {
  private usedTokens: number = 0;
  private limit: number;

  constructor(contextLimit: number) {
    this.limit = contextLimit;
  }

  /** Adds prompt and completion token counts to the running total. */
  public addUsage(promptTokens: number, completionTokens: number): void {
    this.usedTokens += promptTokens + completionTokens;
  }

  /** Returns `true` when cumulative usage reaches the checkpoint threshold. */
  public shouldCheckpoint(): boolean {
    if (this.limit === 0) return false;
    return (this.usedTokens / this.limit) >= CHECKPOINT_THRESHOLD;
  }

  public getUsage(): { used: number; limit: number; percentage: number } {
    const percentage = this.limit > 0 ? (this.usedTokens / this.limit) * 100 : 0;
    return {
      used: this.usedTokens,
      limit: this.limit,
      percentage: percentage
    };
  }

  public reset(): void {
    this.usedTokens = 0;
  }
}
