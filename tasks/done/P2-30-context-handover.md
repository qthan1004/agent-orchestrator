# Task P2-30: Context Handover Flow

## Info
- **ID:** P2-30-context-handover
- **Module:** `src/worker/llm-harness.ts`
- **Group:** Core — LLM Harness
- **Dependencies:** P2-29
- **Priority:** 15
- **Ref:** `dev-docs/2026-05-21_design_llm-harness-wrapper.md` Section 3

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Design Context

When the context window is nearly full (85%), the Harness stops the current task and forces the model to write a **handover report** for the next worker.

### Why handover > checkpoint?

- **Checkpoint** = structured data (files_changed, remaining_steps) — loses reasoning context
- **Handover** = model writes its own summary in natural language — preserves intent, reasoning, and next steps

The model knows best what it was thinking. Let it write the handover itself.

## What to do

### 1. Implement context threshold detection in LLMHarness

```typescript
// Inside LLMHarness.run() — after each adapter.chat() response:
const usage = this.getContextUsage();
if (usage.percent >= this.config.contextThreshold) {
  return await this.generateHandover(messages);
}
```

### 2. Implement `generateHandover()` method

```typescript
private async generateHandover(messages: ChatMessage[]): Promise<HarnessResult> {
  const handoverPrompt: ChatMessage = {
    role: ChatRole.USER,
    content: [
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
      'DO NOT call any tools. Write text report only.'
    ].join('\n')
  };

  messages.push(handoverPrompt);

  // Call LLM WITHOUT tools — force text-only response
  const response = await this.adapter.chat({
    model: this.config.model,
    messages,
    // NO tools array — forces pure text response
  });

  const usage = this.getContextUsage();

  return {
    status: 'context_exceeded',
    summary: `Context ${Math.round(usage.percent * 100)}% — handover generated`,
    tokenUsage: usage,
    handover: response.message.content,
  };
}
```

### 3. Update agent-runner.ts notification

```typescript
const result = await harness.run(messages);

if (result.status === 'context_exceeded') {
  await notifyComplete(server_url, worker_id, task_id, result.summary, false, {
    error: 'context_exceeded',
    hypothesis: 'Context window 85% full — handover generated',
    attempted_fix: 'none',
    handover: result.handover
  });
}
```

### 4. Out of scope (handled by P2-32)

- Server-side respawn logic
- Injecting handover into new worker's context
- Respawn limits

This task only generates the handover. P2-32 handles what the server does with it.

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/worker/llm-harness.ts` |
| MODIFY | `src/worker/agent-runner.ts` |

## Done Criteria
- [x] Harness detects context usage >= 85% threshold
- [x] Harness injects handover prompt to model (no tools, text only)
- [x] Model generates handover report in natural language
- [x] `HarnessResult` includes `handover` string when `status === 'context_exceeded'`
- [x] agent-runner sends handover in `error_context` to server
- [x] Threshold is configurable (default 0.85)
- [x] Normal tasks (under threshold) are NOT affected
- [x] `npm run build` passes
