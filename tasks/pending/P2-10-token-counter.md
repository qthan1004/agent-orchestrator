# Task P2-10: TokenCounter

## Info
- **ID:** P2-10-token-counter
- **Module:** `src/worker/token-counter.ts` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** none
- **Priority:** 8
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.3

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Tạo `TokenCounter` class — track cumulative token usage per worker session.

### API:

```typescript
class TokenCounter {
  constructor(contextLimit: number);
  addUsage(promptTokens: number, completionTokens: number): void;
  shouldCheckpoint(): boolean;  // true if > 80%
  getUsage(): { used: number; limit: number; percentage: number };
  reset(): void;
}
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/token-counter.ts` |

## Done Criteria
- [ ] Tracks cumulative tokens correctly
- [ ] `shouldCheckpoint()` true at 80%+
- [ ] `getUsage()` returns structured data
- [ ] `npm run build` pass
